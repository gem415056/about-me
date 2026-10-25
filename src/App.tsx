import React, { useState, useEffect, useRef } from 'react';
import { DB } from './db/indexedDb';
import { ChatSession, ChatMessage, ChatAttachment, SajuProfile, CustomPrompt, AppSettings } from './types';
import { TokenEstimator } from './utils/tokenEstimator';
import { AIEngine } from './services/aiEngine';
import { CloudBackupManager } from './services/cloudBackup';
import { showToast } from './utils/uiHelpers';

import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { ChatView } from './components/ChatView';
import { LeftDrawer } from './components/LeftDrawer';
import { RightSajuDrawer } from './components/RightSajuDrawer';
import { RightPromptDrawer } from './components/RightPromptDrawer';
import { ReportModal } from './components/ReportModal';
import { SettingsModal } from './components/SettingsModal';
import { SajuModal } from './components/SajuModal';
import { PromptModal } from './components/PromptModal';
import { TokenModal } from './components/TokenModal';
import { InteractiveHomeShowcase } from './components/InteractiveHomeShowcase';

const INITIAL_GREETINGS = {
  psychology: '__PSYCHOLOGY_ONBOARDING__',
  saju: '명리학으로 심층 분석할 만세력과 궁금하신 내용을 함께 전송해주세요!',
  custom: '지정된 시스템 프롬프트를 바탕으로 준비되었습니다. 궁금한 점을 편하게 질문해 주세요!'
};

export const App: React.FC = () => {
  // Mode: 'main' (Psychology/Saju) or 'custom' (Custom Prompt Mode)
  const [appMode, setAppMode] = useState<'main' | 'custom'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('mode') === 'custom') return 'custom';
    }
    return 'main';
  });

  const [currentView, setCurrentView] = useState<'landing' | 'psychology' | 'saju' | 'custom_chat'>('landing');

  // Drawers & Modals
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightSajuDrawerOpen, setRightSajuDrawerOpen] = useState(false);
  const [rightPromptDrawerOpen, setRightPromptDrawerOpen] = useState(false);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [sajuModalOpen, setSajuModalOpen] = useState(false);
  const [editingSajuProfile, setEditingSajuProfile] = useState<SajuProfile | null>(null);

  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [editingCustomPrompt, setEditingCustomPrompt] = useState<CustomPrompt | null>(null);

  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportContent, setReportContent] = useState('');

  // Data
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Saju Profiles
  const [sajuProfiles, setSajuProfiles] = useState<SajuProfile[]>([]);
  const [attachedSajuProfiles, setAttachedSajuProfiles] = useState<SajuProfile[]>([]);

  // Custom Prompts
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [activeCustomPrompt, setActiveCustomPrompt] = useState<CustomPrompt | null>(null);

  // Settings
  const [settings, setSettings] = useState<AppSettings>({});
  const [homeDesignId, setHomeDesignId] = useState<number>(1);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Token Stats
  const [tokenCount, setTokenCount] = useState(0);
  const [tokenMax, setTokenMax] = useState(50000);
  const [currentInputText, setCurrentInputText] = useState('');

  // 1. Initialize Database and Load Initial State
  useEffect(() => {
    async function initApp() {
      try {
        await DB.init();

        // Load Settings
        const savedSettings = await DB.getAll<any>('settings');
        const settingsMap: Record<string, any> = {};
        for (const item of savedSettings) {
          settingsMap[item.id] = item.value || item;
        }

        const loadedSettings: AppSettings = {
          gemini_api_key: settingsMap['gemini_api_key']?.apiKey || '',
          modelName: settingsMap['gemini_model_config']?.modelName || 'gemini-3.8-flash',
          reasoning: settingsMap['gemini_model_config']?.reasoning || 'off',
          reasoningBudget: settingsMap['gemini_model_config']?.reasoningBudget || 1024,
          temperature: settingsMap['gemini_model_config']?.temperature ?? 0.7,
          safety: settingsMap['gemini_safety_config'] || {},
          vertex_config: settingsMap['vertex_config'] || {},
          firestore_config: settingsMap['firestore_config'] || {},
          token_slicing: settingsMap['token_slicing_config'] || { enabled: false, maxTokens: 50000 },
          selected_home_design: settingsMap['home_design_pref']?.designId || 1
        };
        setSettings(loadedSettings);
        if (loadedSettings.token_slicing?.maxTokens) {
          setTokenMax(loadedSettings.token_slicing.maxTokens);
        }
        if (loadedSettings.selected_home_design) {
          setHomeDesignId(loadedSettings.selected_home_design);
        }

        // Load Saju Profiles
        const profiles = await DB.getAll<SajuProfile>('saju_profiles');
        setSajuProfiles(profiles);

        // Load Custom Prompts
        const loadedCustomPrompts = await DB.getAll<CustomPrompt>('custom_prompts');
        setCustomPrompts(loadedCustomPrompts);
        if (loadedCustomPrompts.length > 0) {
          setActiveCustomPrompt(loadedCustomPrompts[0]);
        }

        // Load Sessions
        const allSessions = await DB.getAll<ChatSession>('chat_sessions');
        allSessions.sort((a, b) => b.updatedAt - a.updatedAt);
        setSessions(allSessions);

        // Check view
        if (appMode === 'custom') {
          const customSessList = allSessions.filter(s => s.category === 'custom');
          // Start on landing tester showcase unless opened directly
          setCurrentView('landing');
        } else {
          const savedView = localStorage.getItem('about_me_active_view') as any;
          if (savedView && (savedView === 'psychology' || savedView === 'saju')) {
            navigateToMainCategory(savedView, allSessions);
          }
        }
      } catch (err) {
        console.error('[InitApp Error]:', err);
      }
    }

    initApp();
  }, [appMode]);

  // 2. Handle Browser Popstate (History Navigation)
  useEffect(() => {
    const handlePopState = () => {
      if (reportModalOpen) {
        setReportModalOpen(false);
        return;
      }
      if (settingsModalOpen) {
        setSettingsModalOpen(false);
        return;
      }
      if (sajuModalOpen) {
        setSajuModalOpen(false);
        return;
      }
      if (promptModalOpen) {
        setPromptModalOpen(false);
        return;
      }
      if (tokenModalOpen) {
        setTokenModalOpen(false);
        return;
      }
      if (rightPromptDrawerOpen) {
        setRightPromptDrawerOpen(false);
        return;
      }
      if (rightSajuDrawerOpen) {
        setRightSajuDrawerOpen(false);
        return;
      }
      if (leftDrawerOpen) {
        setLeftDrawerOpen(false);
        return;
      }
      if (currentView !== 'landing') {
        setCurrentView('landing');
        localStorage.setItem('about_me_active_view', 'landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    reportModalOpen,
    settingsModalOpen,
    sajuModalOpen,
    promptModalOpen,
    tokenModalOpen,
    rightPromptDrawerOpen,
    rightSajuDrawerOpen,
    leftDrawerOpen,
    currentView
  ]);

  // 3. Update Token Counts
  useEffect(() => {
    async function refreshTokens() {
      if (currentView === 'landing') return;
      const count = await TokenEstimator.calculateCurrentTokens(
        currentView === 'custom_chat' ? 'custom' : currentView,
        messages,
        currentInputText,
        [],
        attachedSajuProfiles,
        activeCustomPrompt?.content || ''
      );
      setTokenCount(count);
    }
    refreshTokens();
  }, [currentView, messages, currentInputText, attachedSajuProfiles, activeCustomPrompt]);

  // Navigate to category in main mode
  const navigateToMainCategory = async (cat: 'psychology' | 'saju', sessionList: ChatSession[] = sessions) => {
    setCurrentView(cat);
    localStorage.setItem('about_me_active_view', cat);
    history.pushState({ view: cat }, '');

    const catSessions = sessionList.filter(s => s.category === cat);
    if (catSessions.length > 0) {
      await loadSession(catSessions[0]);
    } else {
      await createNewSession(cat);
    }
  };

  // Start chat in custom mode
  const handleStartCustomChat = async () => {
    setCurrentView('custom_chat');
    const customSessList = sessions.filter(s => s.category === 'custom');
    if (customSessList.length > 0) {
      await loadSession(customSessList[0]);
    } else {
      await createNewSession('custom');
    }
  };

  // Load a session
  const loadSession = async (session: ChatSession) => {
    setActiveSession(session);
    let sessionMsgs = await DB.getByIndex<ChatMessage>('chat_messages', 'sessionId', session.id);
    sessionMsgs.sort((a, b) => a.timestamp - b.timestamp);

    // If session has no messages, insert initial greeting
    if (sessionMsgs.length === 0) {
      const initialGreeting: ChatMessage = {
        id: `greeting_${Date.now()}`,
        sessionId: session.id,
        role: 'model',
        content: INITIAL_GREETINGS[session.category] || '대화를 시작하세요.',
        timestamp: Date.now()
      };
      await DB.set('chat_messages', initialGreeting);
      sessionMsgs = [initialGreeting];
    }

    setMessages(sessionMsgs);

    if (session.category === 'custom') {
      setCurrentView('custom_chat');
      if (session.promptId) {
        const found = customPrompts.find(p => p.id === session.promptId);
        if (found) setActiveCustomPrompt(found);
      }
    } else {
      setCurrentView(session.category);
    }
  };

  // Create new session
  const createNewSession = async (cat: 'psychology' | 'saju' | 'custom'): Promise<ChatSession> => {
    const title =
      cat === 'psychology'
        ? '새 심리학 대화'
        : cat === 'saju'
        ? '새 명리학 대화'
        : (activeCustomPrompt ? `${activeCustomPrompt.title} 대화` : '새 맞춤 대화');

    const newSession: ChatSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      category: cat,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      promptId: cat === 'custom' ? activeCustomPrompt?.id : undefined
    };

    await DB.set('chat_sessions', newSession);
    const updated = [newSession, ...sessions];
    setSessions(updated);
    await loadSession(newSession);
    return newSession;
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    await DB.delete('chat_sessions', sessionId);
    const remainingMsgs = await DB.getByIndex<ChatMessage>('chat_messages', 'sessionId', sessionId);
    for (const m of remainingMsgs) {
      await DB.delete('chat_messages', m.id);
    }

    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);

    if (activeSession?.id === sessionId) {
      const currentCat = appMode === 'custom' ? 'custom' : currentView;
      const remainingForCat = updated.filter(s => s.category === currentCat);
      if (remainingForCat.length > 0) {
        await loadSession(remainingForCat[0]);
      } else {
        setCurrentView('landing');
      }
    }
    showToast('대화가 삭제되었습니다.');
  };

  // Delete multiple sessions
  const handleDeleteMultipleSessions = async (sessionIds: string[]) => {
    for (const id of sessionIds) {
      await DB.delete('chat_sessions', id);
      const remainingMsgs = await DB.getByIndex<ChatMessage>('chat_messages', 'sessionId', id);
      for (const m of remainingMsgs) {
        await DB.delete('chat_messages', m.id);
      }
    }

    const updated = sessions.filter(s => !sessionIds.includes(s.id));
    setSessions(updated);

    if (activeSession && sessionIds.includes(activeSession.id)) {
      const currentCat = appMode === 'custom' ? 'custom' : currentView;
      const remainingForCat = updated.filter(s => s.category === currentCat);
      if (remainingForCat.length > 0) {
        await loadSession(remainingForCat[0]);
      } else {
        setCurrentView('landing');
      }
    }
    showToast(`${sessionIds.length}개의 대화가 삭제되었습니다.`);
  };

  // Send message
  const handleSendMessage = async (text: string, attachments: ChatAttachment[]) => {
    if (!activeSession || isStreaming) return;

    let currentSess = activeSession;
    const isFirstUserMessage = messages.filter(m => m.role === 'user').length === 0;

    // Update title from first user message
    if (isFirstUserMessage && text) {
      const cleanTitle = text.slice(0, 24).replace(/\n/g, ' ');
      currentSess = { ...currentSess, title: cleanTitle, updatedAt: Date.now() };
      await DB.set('chat_sessions', currentSess);
      setActiveSession(currentSess);
      setSessions(prev => prev.map(s => (s.id === currentSess.id ? currentSess : s)));
    }

    // 1. Create and save user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u_${Math.random().toString(36).substr(2, 6)}`,
      sessionId: currentSess.id,
      role: 'user',
      content: text,
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: Date.now()
    };

    await DB.set('chat_messages', userMessage);
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // 2. Create placeholder assistant message
    const assistantMsgId = `msg_${Date.now()}_m_${Math.random().toString(36).substr(2, 6)}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      sessionId: currentSess.id,
      role: 'model',
      content: '생각하는 중...',
      timestamp: Date.now() + 1
    };
    setMessages([...updatedMessages, assistantPlaceholder]);
    setIsStreaming(true);
    setStreamingMsgId(assistantMsgId);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let latestOutput = '';
      const promptToUse = currentSess.category === 'custom' ? activeCustomPrompt?.content : undefined;

      const fullResponse = await AIEngine.streamChat(
        currentSess.category,
        updatedMessages,
        text,
        attachments,
        attachedSajuProfiles,
        settings,
        promptToUse,
        chunk => {
          latestOutput = chunk;
          setMessages(prev =>
            prev.map(m => (m.id === assistantMsgId ? { ...m, content: chunk } : m))
          );
        },
        controller.signal
      );

      const finalContent = latestOutput || fullResponse;
      const finalAssistantMsg: ChatMessage = {
        ...assistantPlaceholder,
        content: finalContent
      };
      await DB.set('chat_messages', finalAssistantMsg);
      setMessages(prev =>
        prev.map(m => (m.id === assistantMsgId ? finalAssistantMsg : m))
      );

      setAttachedSajuProfiles([]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        showToast('생성이 중단되었습니다.');
      } else {
        console.error('[AI Error]:', err);
        const errMsg = `⚠️ 오류가 발생했습니다: ${err.message || '다시 시도해 주세요.'}`;
        setMessages(prev =>
          prev.map(m => (m.id === assistantMsgId ? { ...m, content: errMsg } : m))
        );
      }
    } finally {
      setIsStreaming(false);
      setStreamingMsgId(null);
      abortControllerRef.current = null;
    }
  };

  // Regenerate message
  const handleRegenerateMessage = async (msgId: string) => {
    if (isStreaming || !activeSession) return;
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const previousMessages = messages.slice(0, msgIndex);
    const lastUserMsg = [...previousMessages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    const toDelete = messages.slice(msgIndex);
    for (const m of toDelete) {
      await DB.delete('chat_messages', m.id);
    }

    setMessages(previousMessages);
    await handleSendMessage(lastUserMsg.content, lastUserMsg.attachments || []);
  };

  // Edit message
  const handleEditMessage = async (msgId: string, newContent: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const updated = { ...msg, content: newContent };
    await DB.set('chat_messages', updated);
    setMessages(prev => prev.map(m => (m.id === msgId ? updated : m)));
    showToast('메시지가 수정되었습니다.');
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    await DB.delete('chat_messages', msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    showToast('메시지가 삭제되었습니다.');
  };

  // Saju Profile Actions
  const handleToggleAttachProfile = (profile: SajuProfile) => {
    setAttachedSajuProfiles(prev => {
      const exists = prev.some(p => p.id === profile.id);
      return exists ? prev.filter(p => p.id !== profile.id) : [...prev, profile];
    });
  };

  const handleSaveSajuProfile = async (data: Partial<SajuProfile>) => {
    if (editingSajuProfile && editingSajuProfile.id) {
      const updated: SajuProfile = {
        ...editingSajuProfile,
        name: data.name || editingSajuProfile.name,
        textData: data.textData || editingSajuProfile.textData
      };
      await DB.set('saju_profiles', updated);
      setSajuProfiles(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      showToast('명식이 수정되었습니다.');
    } else {
      const newProfile: SajuProfile = {
        name: data.name || '새 명식',
        textData: data.textData || '',
        createdAt: Date.now()
      };
      await DB.set('saju_profiles', newProfile);
      const allProfiles = await DB.getAll<SajuProfile>('saju_profiles');
      setSajuProfiles(allProfiles);
      showToast('명식이 추가되었습니다.');
    }
    setEditingSajuProfile(null);
  };

  const handleDeleteSajuProfile = async (profileId: number) => {
    await DB.delete('saju_profiles', profileId);
    setSajuProfiles(prev => prev.filter(p => p.id !== profileId));
    setAttachedSajuProfiles(prev => prev.filter(p => p.id !== profileId));
    showToast('명식이 삭제되었습니다.');
  };

  const handleDeleteMultipleSajuProfiles = async (profileIds: number[]) => {
    for (const id of profileIds) {
      await DB.delete('saju_profiles', id);
    }
    setSajuProfiles(prev => prev.filter(p => !profileIds.includes(p.id!)));
    setAttachedSajuProfiles(prev => prev.filter(p => !profileIds.includes(p.id!)));
    showToast(`${profileIds.length}개의 명식이 삭제되었습니다.`);
  };

  // Custom Prompt Actions
  const handleSelectCustomPrompt = (prompt: CustomPrompt) => {
    setActiveCustomPrompt(prompt);
    if (activeSession && activeSession.category === 'custom') {
      const updatedSess = { ...activeSession, promptId: prompt.id, updatedAt: Date.now() };
      DB.set('chat_sessions', updatedSess);
      setActiveSession(updatedSess);
      setSessions(prev => prev.map(s => (s.id === updatedSess.id ? updatedSess : s)));
    }
    showToast(`"${prompt.title}" 지침이 적용되었습니다.`);
  };

  const handleSaveCustomPrompt = async (data: Partial<CustomPrompt>) => {
    if (editingCustomPrompt && editingCustomPrompt.id) {
      const updated: CustomPrompt = {
        ...editingCustomPrompt,
        title: data.title || editingCustomPrompt.title,
        content: data.content || editingCustomPrompt.content,
        updatedAt: Date.now()
      };
      await DB.set('custom_prompts', updated);
      setCustomPrompts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      if (activeCustomPrompt?.id === updated.id) {
        setActiveCustomPrompt(updated);
      }
      showToast('프롬프트가 수정되었습니다.');
    } else {
      const newPrompt: CustomPrompt = {
        title: data.title || '새 프롬프트',
        content: data.content || '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await DB.set('custom_prompts', newPrompt);
      const allPrompts = await DB.getAll<CustomPrompt>('custom_prompts');
      setCustomPrompts(allPrompts);
      if (!activeCustomPrompt && allPrompts.length > 0) {
        setActiveCustomPrompt(allPrompts[allPrompts.length - 1]);
      }
      showToast('프롬프트가 추가되었습니다.');
    }
    setEditingCustomPrompt(null);
  };

  const handleDeleteCustomPrompt = async (promptId: number) => {
    await DB.delete('custom_prompts', promptId);
    setCustomPrompts(prev => prev.filter(p => p.id !== promptId));
    if (activeCustomPrompt?.id === promptId) {
      setActiveCustomPrompt(null);
    }
    showToast('프롬프트가 삭제되었습니다.');
  };

  const handleDeleteMultipleCustomPrompts = async (promptIds: number[]) => {
    for (const id of promptIds) {
      await DB.delete('custom_prompts', id);
    }
    setCustomPrompts(prev => prev.filter(p => !promptIds.includes(p.id!)));
    if (activeCustomPrompt?.id && promptIds.includes(activeCustomPrompt.id)) {
      setActiveCustomPrompt(null);
    }
    showToast(`${promptIds.length}개의 프롬프트가 삭제되었습니다.`);
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await DB.set('settings', { id: 'gemini_api_key', apiKey: newSettings.gemini_api_key });
    await DB.set('settings', {
      id: 'gemini_model_config',
      modelName: newSettings.modelName,
      reasoning: newSettings.reasoning,
      reasoningBudget: newSettings.reasoningBudget,
      temperature: newSettings.temperature
    });
    if (newSettings.safety) {
      await DB.set('settings', { id: 'gemini_safety_config', ...newSettings.safety });
    }
    if (newSettings.vertex_config) {
      await DB.set('settings', { id: 'vertex_config', ...newSettings.vertex_config });
    }
    if (newSettings.firestore_config) {
      await DB.set('settings', { id: 'firestore_config', ...newSettings.firestore_config });
    }
    showToast('설정이 저장되었습니다.');
  };

  // Save Token Slicing Config
  const handleSaveTokenConfig = async (enabled: boolean, max: number) => {
    setTokenMax(max);
    const updatedSlicing = { enabled, maxTokens: max };
    setSettings(prev => ({ ...prev, token_slicing: updatedSlicing }));
    await DB.set('settings', { id: 'token_slicing_config', ...updatedSlicing });
    showToast('토큰 슬라이싱 설정이 저장되었습니다.');
  };

  // Save Home Design preference
  const handleSaveDesignPreference = async (designId: number) => {
    setHomeDesignId(designId);
    setSettings(prev => ({ ...prev, selected_home_design: designId }));
    await DB.set('settings', { id: 'home_design_pref', designId });
  };

  // Backup & Restore
  const handleExportBackup = async () => {
    try {
      const dump = await CloudBackupManager.exportFullDatabase();
      CloudBackupManager.downloadBackupFile(dump);
      showToast('백업 파일이 다운로드되었습니다.');
    } catch {
      showToast('백업 생성 실패');
    }
  };

  const handleImportRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const content = reader.result as string;
          await CloudBackupManager.importFullDatabase(content);
          showToast('데이터가 성공적으로 복원되었습니다.');

          const allSessions = await DB.getAll<ChatSession>('chat_sessions');
          allSessions.sort((a, b) => b.updatedAt - a.updatedAt);
          setSessions(allSessions);

          const allProfiles = await DB.getAll<SajuProfile>('saju_profiles');
          setSajuProfiles(allProfiles);

          const allPrompts = await DB.getAll<CustomPrompt>('custom_prompts');
          setCustomPrompts(allPrompts);
          if (allPrompts.length > 0) setActiveCustomPrompt(allPrompts[0]);

          if (allSessions.length > 0) {
            await loadSession(allSessions[0]);
          }
        } catch {
          showToast('복원 실패: 유효하지 않은 백업 파일입니다.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Handle Home Click on Logo
  const handleNavigateHome = () => {
    if (appMode === 'custom') {
      // Return to main Astrology/Psychology home portal as requested
      setAppMode('main');
      setCurrentView('landing');
      window.history.pushState({}, '', '/');
      localStorage.setItem('about_me_active_view', 'landing');
    } else {
      setCurrentView('landing');
      localStorage.setItem('about_me_active_view', 'landing');
      history.pushState({ view: 'landing' }, '');
    }
  };

  return (
    <div id="app-container">
      {/* Global Header */}
      <Header
        appMode={appMode}
        currentView={currentView}
        onNavigateHome={handleNavigateHome}
        onToggleLeftDrawer={() => setLeftDrawerOpen(!leftDrawerOpen)}
        onToggleSajuDrawer={() => setRightSajuDrawerOpen(!rightSajuDrawerOpen)}
        onTogglePromptDrawer={() => setRightPromptDrawerOpen(!rightPromptDrawerOpen)}
        tokenCount={tokenCount}
        tokenMax={tokenMax}
        onOpenTokenModal={() => setTokenModalOpen(true)}
      />

      {/* Main Content Area */}
      <main id="main-content">
        {appMode === 'custom' ? (
          currentView === 'landing' ? (
            <InteractiveHomeShowcase
              prompts={customPrompts}
              activePrompt={activeCustomPrompt}
              onSelectPrompt={handleSelectCustomPrompt}
              onStartChat={handleStartCustomChat}
              onOpenPromptDrawer={() => setRightPromptDrawerOpen(true)}
              savedDesignId={homeDesignId}
              onSaveDesignPreference={handleSaveDesignPreference}
            />
          ) : (
            <ChatView
              category="custom"
              messages={messages}
              isStreaming={isStreaming}
              streamingMessageId={streamingMsgId}
              onSendMessage={handleSendMessage}
              onRegenerateMessage={handleRegenerateMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onInputChange={text => setCurrentInputText(text)}
            />
          )
        ) : (
          currentView === 'landing' ? (
            <LandingView onSelectCategory={cat => navigateToMainCategory(cat)} />
          ) : (
            <ChatView
              category={currentView as 'psychology' | 'saju'}
              messages={messages}
              isStreaming={isStreaming}
              streamingMessageId={streamingMsgId}
              attachedSajuProfiles={attachedSajuProfiles}
              onRemoveSajuProfile={id => setAttachedSajuProfiles(prev => prev.filter(p => p.id !== id))}
              onSendMessage={handleSendMessage}
              onRegenerateMessage={handleRegenerateMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onOpenReport={content => {
                setReportContent(content);
                setReportModalOpen(true);
              }}
              onInputChange={text => setCurrentInputText(text)}
            />
          )
        )}
      </main>

      {/* Left Drawer */}
      <LeftDrawer
        isOpen={leftDrawerOpen}
        appMode={appMode}
        sessions={sessions}
        activeSessionId={activeSession?.id || null}
        onSelectSession={session => {
          loadSession(session);
        }}
        onDeleteSession={handleDeleteSession}
        onDeleteMultipleSessions={handleDeleteMultipleSessions}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onBackup={handleExportBackup}
        onRestore={handleImportRestore}
        onOpenCustomTab={() => {
          // Open custom mode in new tab
          window.open('?mode=custom', '_blank');
        }}
        onClose={() => setLeftDrawerOpen(false)}
      />

      {/* Right Saju Drawer (Main mode) */}
      <RightSajuDrawer
        isOpen={rightSajuDrawerOpen}
        profiles={sajuProfiles}
        attachedProfileIds={attachedSajuProfiles.map(p => p.id!).filter(Boolean)}
        onToggleAttachProfile={handleToggleAttachProfile}
        onOpenAddModal={() => {
          setEditingSajuProfile(null);
          setSajuModalOpen(true);
        }}
        onOpenEditModal={p => {
          setEditingSajuProfile(p);
          setSajuModalOpen(true);
        }}
        onDeleteProfile={handleDeleteSajuProfile}
        onDeleteMultipleProfiles={handleDeleteMultipleSajuProfiles}
        onClose={() => setRightSajuDrawerOpen(false)}
      />

      {/* Right Prompt Drawer (Custom mode) */}
      <RightPromptDrawer
        isOpen={rightPromptDrawerOpen}
        prompts={customPrompts}
        activePromptId={activeCustomPrompt?.id || null}
        onSelectPrompt={handleSelectCustomPrompt}
        onOpenAddModal={() => {
          setEditingCustomPrompt(null);
          setPromptModalOpen(true);
        }}
        onOpenEditModal={prompt => {
          setEditingCustomPrompt(prompt);
          setPromptModalOpen(true);
        }}
        onDeletePrompt={handleDeleteCustomPrompt}
        onDeleteMultiplePrompts={handleDeleteMultipleCustomPrompts}
        onClose={() => setRightPromptDrawerOpen(false)}
      />

      {/* Saju Add/Edit Modal */}
      <SajuModal
        isOpen={sajuModalOpen}
        profileToEdit={editingSajuProfile}
        onSave={handleSaveSajuProfile}
        onClose={() => {
          setSajuModalOpen(false);
          setEditingSajuProfile(null);
        }}
      />

      {/* Custom Prompt Add/Edit Modal */}
      <PromptModal
        isOpen={promptModalOpen}
        promptToEdit={editingCustomPrompt}
        onSave={handleSaveCustomPrompt}
        onClose={() => {
          setPromptModalOpen(false);
          setEditingCustomPrompt(null);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onClose={() => setSettingsModalOpen(false)}
      />

      {/* Token Modal */}
      <TokenModal
        isOpen={tokenModalOpen}
        enabled={Boolean(settings.token_slicing?.enabled)}
        maxTokens={tokenMax}
        onToggleEnabled={en => handleSaveTokenConfig(en, tokenMax)}
        onChangeMaxTokens={max => handleSaveTokenConfig(Boolean(settings.token_slicing?.enabled), max)}
        onClose={() => setTokenModalOpen(false)}
      />

      {/* Fullscreen Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        content={reportContent}
        onClose={() => setReportModalOpen(false)}
        onContinueTest={() => setReportModalOpen(false)}
      />
    </div>
  );
};

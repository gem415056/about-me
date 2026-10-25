import { DB } from '../db/indexedDb';

export const CloudBackupManager = {
  parseFirebaseConfig(configStr: string): { projectId: string; apiKey: string } | null {
    if (!configStr) return null;
    try {
      const parsed = JSON.parse(configStr);
      if (parsed.projectId && parsed.apiKey) return parsed;
    } catch {
      const projectIdMatch = configStr.match(/projectId\s*:\s*["']([^"']+)["']/);
      const apiKeyMatch = configStr.match(/apiKey\s*:\s*["']([^"']+)["']/);
      if (projectIdMatch && apiKeyMatch) {
        return {
          projectId: projectIdMatch[1],
          apiKey: apiKeyMatch[1]
        };
      }
    }
    return null;
  },

  async exportFullDatabase(): Promise<string> {
    const dump = {
      prompts: await DB.getAll('prompts'),
      settings: await DB.getAll('settings'),
      saju_profiles: await DB.getAll('saju_profiles'),
      custom_prompts: await DB.getAll('custom_prompts'),
      chat_sessions: await DB.getAll('chat_sessions'),
      chat_messages: await DB.getAll('chat_messages'),
      exportedAt: Date.now()
    };
    return JSON.stringify(dump, null, 2);
  },

  async importFullDatabase(jsonStr: string): Promise<boolean> {
    try {
      const dump = JSON.parse(jsonStr);
      if (!dump) return false;

      if (Array.isArray(dump.prompts)) {
        for (const p of dump.prompts) await DB.set('prompts', p);
      }
      if (Array.isArray(dump.settings)) {
        for (const s of dump.settings) await DB.set('settings', s);
      }
      if (Array.isArray(dump.saju_profiles)) {
        for (const p of dump.saju_profiles) await DB.set('saju_profiles', p);
      }
      if (Array.isArray(dump.custom_prompts)) {
        for (const cp of dump.custom_prompts) await DB.set('custom_prompts', cp);
      }
      if (Array.isArray(dump.chat_sessions)) {
        for (const s of dump.chat_sessions) await DB.set('chat_sessions', s);
      }
      if (Array.isArray(dump.chat_messages)) {
        for (const m of dump.chat_messages) await DB.set('chat_messages', m);
      }
      return true;
    } catch (e) {
      console.error('[Import DB error]:', e);
      throw e;
    }
  },

  downloadBackupFile(jsonStr: string, fileName = `about_me_backup_${new Date().toISOString().slice(0, 10)}.json`): void {
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

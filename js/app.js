/**
 * ABOUT ME - Core Application & Navigation Stack Manager
 */

// 첫 진입 시 화면 전용 초기 안내 메시지 템플릿 (대화가 비어있는 세션에서도 영구 출력 보장)
const INITIAL_GREETINGS = {
  psychology: `__PSYCHOLOGY_ONBOARDING__`,
  saju: `명리학으로 심층 분석할 만세력과 궁금하신 내용을 함께 전송해주세요!`
};

// 1. 뒤로가기 제스처 1단계 정밀 제어 관리자 (History Stack Manager)
const NavStack = {
  stack: [],
  isProgrammaticBack: false,

  init() {
    // 최초 상태 저장 (새로고침 시 마지막 뷰 복원)
    const savedView = (typeof localStorage !== 'undefined' && localStorage.getItem('about_me_active_view')) || 'landing';
    history.replaceState({ depth: 0, view: savedView }, '');

    window.addEventListener('popstate', (e) => {
      // 닫기 버튼 등으로 인한 프로그램적 history.back()인 경우 라우터 이동 방지
      if (this.isProgrammaticBack) {
        this.isProgrammaticBack = false;
        return;
      }

      if (this.stack.length > 0) {
        // 스택에 열려있는 모달/서랍/오버레이가 있다면 가장 최근 것 하나만 닫기
        const topItem = this.stack.pop();
        if (typeof topItem.onClose === 'function') {
          topItem.onClose();
        }
      } else {
        // 스택에 요소가 없고 대화방 화면인 경우 -> 랜딩 화면으로 1단계 복귀
        if (Router.currentView !== 'landing') {
          Router.navigate('landing', false);
        }
      }
    });
  },

  // 모달, 서랍 등이 열릴 때 스택에 푸시
  push(item) {
    history.pushState({ depth: history.state ? history.state.depth + 1 : 1, id: item.id }, '');
    this.stack.push(item);
  },

  // 프로그램적으로 닫힐 때 수동 스택 팝
  pop() {
    if (this.stack.length > 0) {
      this.stack.pop();
      this.isProgrammaticBack = true;
      history.back();
    }
  }
};

// 2. 화면 전환 라우터 (Router)
const Router = {
  currentView: 'landing',

  views: {
    landing: document.getElementById('view-landing'),
    psychology: document.getElementById('view-psychology'),
    saju: document.getElementById('view-saju')
  },

  headers: {
      header1: document.getElementById('header-1'),
      title: document.getElementById('header-title'),
      btnSajuHand: document.getElementById('btn-toggle-saju-drawer')
    },
  
  navigate(viewName, pushHistory = true) {
    if (!this.views[viewName]) return;

    // 모든 뷰 비활성화
    Object.values(this.views).forEach(view => {
      view.classList.remove('active');
      view.classList.add('hidden');
    });

    // 대상 뷰 활성화
    const target = this.views[viewName];
    target.classList.remove('hidden');
    // 리플로우 강제 후 active 추가로 부드러운 전환 보장
    void target.offsetWidth;
    target.classList.add('active');

    this.currentView = viewName;

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('about_me_active_view', viewName);
        if (viewName === 'landing') {
          localStorage.removeItem('about_me_active_session_id');
        }
      }
    } catch (e) {}

    // 헤더 상태 동기화
    this.updateHeaders(viewName);

    if (pushHistory && viewName !== 'landing') {
      history.pushState({ depth: (history.state ? history.state.depth : 0) + 1, view: viewName }, '');
    }
  },

  updateHeaders(viewName) {
    this.headers.header1.classList.remove('hidden');
    if (viewName === 'landing') {
      document.body.classList.add('is-landing-view');
      if (this.headers.btnSajuHand) this.headers.btnSajuHand.classList.add('hidden');
    } else {
      document.body.classList.remove('is-landing-view');
      if (viewName === 'psychology') {
        if (this.headers.btnSajuHand) this.headers.btnSajuHand.classList.add('hidden'); // 심리학에선 손가락 숨김
      } else if (viewName === 'saju') {
        if (this.headers.btnSajuHand) this.headers.btnSajuHand.classList.remove('hidden'); // 명리학에서만 손가락 노출
      }
      this.headers.title.textContent = '𝗔𝗕𝗢𝗨𝗧 𝗠𝗘';
    }
  }
};

// 5. 모바일 가상 키보드 뷰포트 관리자 (KeyboardViewportManager)
const KeyboardViewportManager = {
  init() {
    // iOS Safari에서 컨테이너 높이 임의 축소로 인한 빈 사각형 박스 및 윈도우 스크롤 누수를 원천 차단
    window.addEventListener('scroll', () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    }, { passive: true });
  }
};

// 7. 명리학 명식 관리, 다중 누적 첨부 및 일괄 삭제 (SajuManager)
const SajuManager = {
  attachedProfiles: [],
  tempImageData: null,
  isDeleteMode: false,
  selectedForDeletion: new Set(),

  // 삭제 모드 토글 및 일괄 삭제 실행
  async toggleDeleteMode() {
    const btn = document.getElementById('btn-toggle-delete-saju');
    if (!this.isDeleteMode) {
      // 1. 삭제 선택 모드 진입
      this.isDeleteMode = true;
      this.selectedForDeletion.clear();
      if (btn) btn.classList.add('active');
      await this.renderProfilesList();
    } else {
      // 2. 이미 삭제 모드인 상태에서 다시 누름 -> 선택 항목 일괄 삭제 실행!
      if (this.selectedForDeletion.size > 0) {
        if (confirm(`선택한 ${this.selectedForDeletion.size}개의 명식을 완전히 삭제하시겠습니까?`)) {
          for (const id of this.selectedForDeletion) {
            await DB.delete('saju_profiles', id);
          }
        }
      }
      this.isDeleteMode = false;
      this.selectedForDeletion.clear();
      if (btn) btn.classList.remove('active');
      await this.renderProfilesList();
    }
  },

  // IndexedDB로부터 명식 목록 화면 렌더링
  async renderProfilesList() {
    const listEl = document.getElementById('saju-profiles-list');
    if (!listEl) return;

    const profiles = await DB.getAll('saju_profiles');
    if (!profiles || profiles.length === 0) {
      listEl.innerHTML = '<div class="empty-list-notice">등록된 명식이 없습니다.<br>\'+\' 버튼으로 만세력을 추가하세요.</div>';
      return;
    }

    listEl.innerHTML = '';
    profiles.forEach(p => {
      const item = document.createElement('div');
      const isSelected = this.selectedForDeletion.has(p.id);
      item.className = `saju-profile-item ${isSelected ? 'delete-selected' : ''}`;
      item.innerHTML = `<span class="saju-item-name">${p.name}</span>`;

      item.addEventListener('click', () => {
        if (this.isDeleteMode) {
          // 삭제 모드일 때는 선택/해제 토글
          if (this.selectedForDeletion.has(p.id)) {
            this.selectedForDeletion.delete(p.id);
            item.classList.remove('delete-selected');
          } else {
            this.selectedForDeletion.add(p.id);
            item.classList.add('delete-selected');
          }
        } else {
          // 일반 모드일 때는 입력창에 만세력 누적 첨부
          this.attachProfile(p);
        }
      });

      listEl.appendChild(item);
    });
  },

  // 입력창에 명식 태그 누적 첨부
  attachProfile(profile) {
    this.attachedProfiles.push(profile);
    this.renderAttachedTags();
  },

  // 첨부된 태그 제거
  removeProfile(index) {
    this.attachedProfiles.splice(index, 1);
    this.renderAttachedTags();
  },

  // 입력창 상단 태그 칩 렌더링
  renderAttachedTags() {
    const container = document.getElementById('saju-attached-tags');
    if (!container) return;

    if (this.attachedProfiles.length === 0) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    container.classList.remove('hidden');
    container.innerHTML = '';

    this.attachedProfiles.forEach((p, idx) => {
      const chip = document.createElement('div');
      chip.className = 'saju-tag-chip';
      chip.innerHTML = `
        <span>[${p.name}]의 만세력</span>
        <button type="button" class="saju-tag-remove" data-index="${idx}">✕</button>
      `;
      container.appendChild(chip);
    });

    // 태그 제거 클릭 이벤트 바인딩
    container.querySelectorAll('.saju-tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        this.removeProfile(idx);
      });
    });
  },

  // 이미지 스마트 압축기 (초고해상도 폰 카메라 사진 10MB -> 200KB 최적화)
  compressImage(file, maxDim = 1200, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  compressDataUrl(dataUrl, maxDim = 1200, quality = 0.82) {
    if (!dataUrl || dataUrl.length < 500000) return Promise.resolve(dataUrl);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  // 새 명식 등록 처리 (Base64 변환 후 저장)
  async saveNewProfile(name, base64Data) {
    if (!name || !base64Data) return false;
    await DB.set('saju_profiles', {
      name: name.trim(),
      imageData: base64Data,
      createdAt: Date.now()
    });
    await this.renderProfilesList();
    return true;
  }
};

// 8. 경량 마크다운 파서 & 안전화된 보고서 감지 & 게이지 비주얼 렌더러 (MarkdownParser)
const MarkdownParser = {
  // [핵심 1] 안전화된 보고서 분리 추출기 (보고서 발견 시 대화창에는 일체 텍스트 미노출, 순수 버튼만)
  extractReport(rawText) {
    if (!rawText) return { hasReport: false, reportContent: '', chatContent: '' };

    // 패턴 A: [REPORT_START] ... [REPORT_END] (엔터 유무 무관, 닫는 태그 생략도 포괄)
    const explicitRegex = /\[REPORT_START\]([\s\S]*?)(?:\[REPORT_END\]|$)/i;
    const explicitMatch = rawText.match(explicitRegex);

    if (explicitMatch) {
      const reportText = explicitMatch[1].trim();
      return {
        hasReport: true,
        reportContent: reportText,
        chatContent: ''
      };
    }

    // 패턴 B: AI가 실수로 [REPORT_START] 태그를 빼먹고 '# 1부'로 바로 시작한 경우 자동 안전 구출!
    const implicitRegex = /(#\s*1부[\s\S]*)/i;
    const implicitMatch = rawText.match(implicitRegex);

    if (implicitMatch) {
      const reportStartIdx = implicitMatch.index;
      return {
        hasReport: true,
        reportContent: rawText.substring(reportStartIdx).trim(),
        chatContent: ''
      };
    }

    return {
      hasReport: false,
      reportContent: '',
      chatContent: rawText
    };
  },

  // [핵심 2] 마크다운 테이블 파서 (스펙트럼 포인터 & 프로그레스 바 & 표준 표 자동 시각화)
  parseMarkdownTable(text) {
    return text.replace(/(?:^[ \t]*\|?[^\n]+\|[^\n]*(?:\n|$)){2,}/gm, (tableMarkdown) => {
      const rawLines = tableMarkdown.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (rawLines.length < 2) return tableMarkdown;

      // 구분선 행(예: | :--- | :--- | :---: | 또는 |---|---|) 탐지
      let separatorIdx = rawLines.findIndex((l, idx) => idx > 0 && /^[|:\s-]+$/.test(l));

      let headerLine = rawLines[0];
      let dataLines = [];

      if (separatorIdx !== -1) {
        dataLines = rawLines.filter((l, idx) => idx !== 0 && idx !== separatorIdx);
      } else {
        dataLines = rawLines.slice(1);
      }

      const splitCells = (line) => {
        let cells = line.split('|').map(s => s.trim());
        if (cells.length > 0 && cells[0] === '') cells.shift();
        if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
        return cells;
      };

      const headers = splitCells(headerLine);
      if (headers.length === 0) return tableMarkdown;

      // 게이지 표 여부 감지: 특수문자, 퍼센트, 게이지 관련 키워드 전수 감지
      const hasGauge = tableMarkdown.includes('░') ||
                       tableMarkdown.includes('█') ||
                       tableMarkdown.includes('■') ||
                       tableMarkdown.includes('▓') ||
                       tableMarkdown.includes('▰') ||
                       tableMarkdown.includes('%') ||
                       /게이지|스펙트럼|활성도|에너지|비중|프로파일|추진력/i.test(headerLine);

      let tableHtml = `\n\n<div class="report-table-wrapper"><table class="${hasGauge ? 'report-gauge-table' : 'report-standard-table'}">`;
      tableHtml += `<thead><tr>`;
      headers.forEach((h, idx) => {
        let colClass = '';
        if (hasGauge) {
          if (idx === 0) colClass = 'col-label';
          else if (headers.length === 4 && idx === 1) colClass = 'col-sub-label';
          else if ((headers.length === 4 && idx === 2) || (headers.length === 3 && idx === 1)) colClass = 'col-gauge-track';
          else colClass = 'col-percent';
        }
        tableHtml += `<th class="${colClass}">${h}</th>`;
      });
      tableHtml += `</tr></thead><tbody>`;

      dataLines.forEach(line => {
        const cells = splitCells(line);
        if (cells.length === 0) return;

        const percentMatch = line.match(/(\d+)%/);
        const percentVal = percentMatch ? Math.min(100, Math.max(0, parseInt(percentMatch[1], 10))) : null;

        tableHtml += `<tr>`;
        cells.forEach((cell, idx) => {
          const isGaugeCell = /[░█■□▪▫▓▒▰▱●○]/.test(cell) || (hasGauge && ((headers.length === 4 && idx === 2) || (headers.length === 3 && idx === 1)));

          if (isGaugeCell) {
            let finalPercent = percentVal;
            if (finalPercent === null) {
              const totalLen = cell.length || 20;
              const firstFill = cell.search(/[█■▓▰●#]/);
              finalPercent = firstFill !== -1 ? Math.round((firstFill / totalLen) * 100) : 50;
            }

            // 사용자 지적 완벽 반영:
            // 1. 중간에만 까만 네모 (스펙트럼 포인터): 앞에 빈 칸이 오고 중간/끝에 채운 블록이 오는 경우
            // 2. 지점까지 쭉 검정 사각형 (프로그레스 바): 처음부터 채운 블록이 쭉 이어지는 경우
            const isPointer = /^[░\s□▫▱○-]+[█■▓▰●#]/.test(cell);

            if (isPointer) {
              tableHtml += `<td class="col-gauge-track">
                <div class="gauge-visual-track gauge-type-pointer">
                  <div class="gauge-pointer-thumb" style="left: ${finalPercent}%;"></div>
                </div>
              </td>`;
            } else {
              tableHtml += `<td class="col-gauge-track">
                <div class="gauge-visual-track gauge-type-bar">
                  <div class="gauge-visual-bar" style="width: ${finalPercent}%;"></div>
                </div>
              </td>`;
            }
          } else if (/^\d+%$/.test(cell.replace(/\s/g, ''))) {
            tableHtml += `<td class="col-percent">${cell}</td>`;
          } else {
            let colClass = '';
            if (hasGauge) {
              colClass = idx === 0 ? 'col-label' : (headers.length === 4 && idx === 1 ? 'col-sub-label' : '');
            }
            tableHtml += `<td class="${colClass}">${cell}</td>`;
          }
        });
        tableHtml += `</tr>`;
      });

      tableHtml += `</tbody></table></div>\n\n`;
      return tableHtml;
    });
  },

  // [핵심 3] 불릿 및 순서 목록 파서 (하위 들여쓰기 설명문 완벽 통합)
  parseLists(text) {
    // 1. 번호 매겨진 목록 (1. 2. 3.)
    text = text.replace(/(?:^[ \t]*\d+\.[ \t]+.+?(?:\n[ \t]{2,}.+?)*(\n|$))+/gm, (match) => {
      const rawItems = match.trim().split(/\n(?=[ \t]*\d+\.[ \t]+)/);
      const items = rawItems.map(item => {
        const cleaned = item.replace(/^[ \t]*\d+\.[ \t]+/, '').replace(/\n[ \t]{2,}/g, ' ');
        return `<li>${cleaned.trim()}</li>`;
      }).join('');
      return `<ol>${items}</ol>`;
    });

    // 2. 불릿 목록 (- or *)
    text = text.replace(/(?:^[ \t]*[-*][ \t]+.+?(?:\n[ \t]{2,}.+?)*(\n|$))+/gm, (match) => {
      const rawItems = match.trim().split(/\n(?=[ \t]*[-*][ \t]+)/);
      const items = rawItems.map(item => {
        const cleaned = item.replace(/^[ \t]*[-*][ \t]+/, '').replace(/\n[ \t]{2,}/g, ' ');
        return `<li>${cleaned.trim()}</li>`;
      }).join('');
      return `<ul>${items}</ul>`;
    });

    return text;
  },

  // [핵심 3.5] 심리학 보고서 JSON 게이지바 시각화 렌더러 (빅파이브 투톤 대칭 바 & 10% 농도 실린더)
  renderJsonGauge(data) {
    if (!data || typeof data !== 'object') return '';

    const keys = Object.keys(data);
    const isBigFive = keys.some(k => k === '개방성' || k === '외향성' || k === '성실성');

    if (isBigFive) {
      const BIG_FIVE_POLES = {
        '개방성': { left: '보수·현실안주', right: '창의·호기심' },
        '외향성': { left: '내향 충전', right: '외부 자극' },
        '우호성': { left: '비판·경쟁', right: '신뢰·배려' },
        '성실성': { left: '유연·즉흥', right: '규율·철저' },
        '신경증': { left: '정서적 안정', right: '위협 민감' }
      };

      let rowsHtml = '';
      keys.forEach(key => {
        const pole = BIG_FIVE_POLES[key] || { left: '낮음', right: '높음' };
        const rawScore = parseInt(data[key], 10) || 50;
        const diff = rawScore - 50;
        const absDiff = Math.abs(diff);

        let barHtml = '';
        let labelText = '';

        if (diff >= 0) {
          labelText = `${key} +${diff}% 우세`;
          barHtml = `<div class="bipolar-bar-pos" style="width: ${Math.min(50, absDiff)}%;"></div>`;
        } else {
          labelText = `${key} -${absDiff}% ${pole.left} 우세`;
          barHtml = `<div class="bipolar-bar-neg" style="width: ${Math.min(50, absDiff)}%;"></div>`;
        }

        rowsHtml += `
          <div class="bipolar-item-row">
            <div class="bipolar-meta-row">
              <span>${pole.left}</span>
              <span style="font-weight: 700; color: #2A3022;">${labelText}</span>
              <span>${pole.right}</span>
            </div>
            <div class="bipolar-track">
              <div class="bipolar-center-pin-subtle"></div>
              ${barHtml}
            </div>
          </div>
        `;
      });

      return `
        <div class="report-card-container">
          <div class="report-card-header">
            <h4 class="report-card-title">🧬 Big Five 5대 요인 분석</h4>
            <p class="report-card-desc">기저 기질의 스펙트럼 밸런스</p>
          </div>
          ${rowsHtml}
        </div>
      `;
    }

    // Unipolar gauges (융 인지기능, 에니어그램, DISC, 맥클리랜드)
    let title = '심리 지표 활성도';
    let desc = '에너지 비중 및 기능별 활성도';
    const typeLabel = data['도출유형'];

    if (keys.some(k => k.includes('기능:'))) {
      title = `🧠 융의 인지 기능 위계${typeLabel ? ` (${typeLabel})` : ''}`;
      desc = '두뇌 정보 처리 알고리즘별 활성도';
    } else if (keys.some(k => k === '자기보존' || k === '일대일' || k === '사회적')) {
      title = `⚓ 에니어그램 본능 삼원소${typeLabel ? ` (${typeLabel})` : ''}`;
      desc = '본능적 에너지 집중 비중';
    } else if (keys.some(k => k === '주도형' || k === '사교형' || k === '안정형' || k === '신중형')) {
      title = '🎭 DISC 4대 행동 양식';
      desc = '사회적 가면 및 현실 처세 페르소나';
    } else if (keys.some(k => k === '성취욕구' || k === '권력욕구' || k === '친교욕구')) {
      title = '⚡ 맥클리랜드 3대 동기 엔진';
      desc = '행동을 점화하는 핵심 추진 동기';
    }

    let rowsHtml = '';
    keys.forEach(key => {
      if (key === '도출유형') return;
      const score = Math.min(100, Math.max(0, parseInt(data[key], 10) || 0));

      let barColor = '#B2B9A8';
      if (score > 80) barColor = '#4B533C'; // 쌩까망 완전 배제 딥 포레스트 말차
      else if (score > 60) barColor = '#5D664D';
      else if (score > 40) barColor = '#747B61';
      else if (score > 20) barColor = '#959F89';

      rowsHtml += `
        <div class="unipolar-item-row">
          <div class="unipolar-meta-row">
            <span>${key}</span>
            <span style="font-weight: 700; color: #2A3022;">${score}%</span>
          </div>
          <div class="unipolar-track">
            <div class="unipolar-fill-bar" style="width: ${score}%; background: ${barColor};"></div>
          </div>
        </div>
      `;
    });

    return `
      <div class="report-card-container">
        <div class="report-card-header">
          <h4 class="report-card-title">${title}</h4>
          <p class="report-card-desc">${desc}</p>
        </div>
        ${rowsHtml}
      </div>
    `;
  },

  // [핵심 4] 마크다운 본체 파서
  parse(text) {
    if (!text) return '';

    // 1. CRLF 개행 표준화
    let processed = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 1.5. JSON 게이지 블록 변환
    processed = processed.replace(/```json\s*([\s\S]*?)\s*```/g, (match, jsonStr) => {
      try {
        const data = JSON.parse(jsonStr.trim());
        return this.renderJsonGauge(data);
      } catch (e) {
        return match;
      }
    });

    // 2. 마크다운 테이블 변환
    processed = this.parseMarkdownTable(processed);

    // 3. 헤더 변환
    processed = processed.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    processed = processed.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    processed = processed.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 4. 인용구 (> 문장)
    // 연속된 > 문장들을 단일 blockquote로 결합하여 내부 줄바꿈 보존 및 마크다운 완벽 지원
    processed = processed.replace(/(?:^>\s?.*(?:\n|$))+/gm, (block) => {
      const innerLines = block.trim().split('\n')
        .map(l => l.replace(/^>\s?/, ''))
        .filter(l => l.length > 0);
      return `<blockquote>${innerLines.join('<br>')}</blockquote>\n`;
    });

    // 5. 볼드체, 인라인 코드, 밑줄 파싱
    processed = processed.replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    processed = processed.replace(/\*\*([\s\S]+?)\*\*/g, '<span class="md-bold-highlight">$1</span>');
    processed = processed.replace(/__([\s\S]+?)__/g, '<span class="md-bold-highlight">$1</span>');
    // `코드` 인라인 칩
    processed = processed.replace(/`([^`\n]+?)`/g, '<span class="md-inline-code">$1</span>');
    // *텍스트* : 별표를 완전히 없애고 깔끔한 밑줄로 파싱!
    processed = processed.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<span class="md-underline">$1</span>');
    processed = processed.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<span class="md-underline">$1</span>');

    // 6. 구분선
    processed = processed.replace(/^---$/gim, '<hr>');

    // 7. 목록(List) 변환
    processed = this.parseLists(processed);

    // 8. 단락(<p>) 및 자연스러운 여백 처리 (과도한 <br> 누적 방지)
    const blocks = processed.split(/\n{2,}/);
    processed = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // 이미 블록 레벨 태그로 시작하는 경우 p 태그로 감싸지 않음
      if (/^<(h[1-6]|table|div|ul|ol|blockquote|hr)/i.test(trimmed)) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).filter(Boolean).join('');

    return processed;
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  // 인라인 마크다운 (볼드체, 인라인 코드, 밑줄) 전용 파서
  parseInline(str) {
    if (!str) return '';
    let s = this.escapeHtml(str);
    s = s.replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([\s\S]+?)\*\*/g, '<span class="md-bold-highlight">$1</span>');
    s = s.replace(/__([\s\S]+?)__/g, '<span class="md-bold-highlight">$1</span>');
    s = s.replace(/`([^`\n]+?)`/g, '<span class="md-inline-code">$1</span>');
    s = s.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<span class="md-underline">$1</span>');
    s = s.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<span class="md-underline">$1</span>');
    return s;
  },

  // [핵심 5] 심리학 전용 대화형 선택지 & 도시에 파서 (체크박스, 순서 추적, 밑줄 입력창, 원클릭 전송)
  parseChoiceDossier(rawText, msgId) {
    if (!rawText) return { hasChoices: false, html: '' };

    // 선택지 번호(1. or 1.:)와 직접 입력 또는 답변 보충 포함 여부 감지 (인용구 > 유무 무관, [ ] 체크박스 유무 무관)
    const hasNumbered = /(?:^|\n)\s*>?\s*(?:[-*•]\s*)?(?:\[\s*[xX_\- ]?\s*\]\s*)?1(?:\.|\:|\.\:|\))\s+.+/m.test(rawText);
    const hasDirect = /직접\s*입력/.test(rawText);
    const hasSupplement = /답변\s*보충/.test(rawText);

    if (!hasNumbered && !hasDirect && !hasSupplement) {
      return { hasChoices: false, html: '' };
    }

    const lines = rawText.split('\n');
    const preambleLines = [];
    const choiceLines = [];
    let isChoiceSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!isChoiceSection && (
        trimmed.startsWith('>') ||
        /^(?:\[상황\s*질의\]|💡\s*\[|\[질문\])/.test(trimmed) ||
        /^\s*(?:[-*•]\s*)?(?:\[\s*[xX_\- ]?\s*\]\s*)?1(?:\.|\:|\.\:|\))\s+/.test(trimmed)
      )) {
        isChoiceSection = true;
      }

      if (isChoiceSection) {
        choiceLines.push(line);
      } else {
        preambleLines.push(line);
      }
    }

    if (choiceLines.length === 0) {
      return { hasChoices: false, html: '' };
    }

    const preambleText = preambleLines.join('\n').trim();
    const preambleHtml = preambleText ? this.parse(preambleText) : '';

    let scenarioTitle = '';
    const choices = [];
    let directChoice = null;
    let supplementObj = null;

    choiceLines.forEach(rawLine => {
      // 1. 인용구 '>' 기호 제거
      let clean = rawLine.replace(/^\s*>\s?/, '').trim();
      if (!clean) return;

      // 2. 불릿 기호 제거 (- or * or •)
      clean = clean.replace(/^[-*•]\s+/, '').trim();

      // 3. 마크다운 체크박스 마커 ([ ] or [x] or ( )) 제거
      clean = clean.replace(/^\[\s*[xX_\- ]?\s*\]\s*/, '').replace(/^\(\s*[xX_\- ]?\s*\)\s*/, '').trim();

      // 상황 질의 타이틀 감지
      if (/^(?:💡\s*)?\[(?:상황\s*질의|질문|상황)\]/i.test(clean) || (choices.length === 0 && !directChoice && !/^\d+(?:\.|\:|\.\:|\))/.test(clean) && !clean.includes('답변 보충') && !clean.includes('직접 입력'))) {
        clean = clean.replace(/\[\s*선택\s*안내\s*\]/gi, '').trim();
        scenarioTitle = clean;
        return;
      }

      // 6. 직접 입력 감지 (e.g. "[ ] 6. ⟦직접 입력⟧", "6.: ⟦직접 입력⟧", "⟦직접 입력⟧", "[직접 입력]" 등 모든 변형 안전 지원)
      if (/직접\s*입력/i.test(clean)) {
        const phMatch = clean.match(/\(([^)]+)\)/);
        let ph = phMatch ? phMatch[1].trim() : '보기에 없는 내 생각이나 상황을 적어주세요';
        directChoice = {
          id: 6,
          placeholder: ph
        };
        return;
      }

      // 답변 보충 감지 (e.g. "⟦답변 보충⟧", "[답변 보충]", "답변 보충" 등 모든 변형 안전 지원)
      if (/답변\s*보충/i.test(clean)) {
        const phMatch = clean.match(/\(([^)]+)\)/);
        let ph = phMatch ? phMatch[1].trim() : '답변 일부 발췌, 재조립, 기타 메모를 자유롭게 입력';
        supplementObj = {
          placeholder: ph
        };
        return;
      }

      // 번호 매겨진 선택지 (1~5번) - "1.: ", "1. ", "1: ", "1) " 등 완벽 포용
      const numMatch = clean.match(/^(\d+)(?:\.|\:|\.\:|\))\s*(.+)$/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        let text = numMatch[2].trim();
        // 앞부분에 남아있는 콜론이나 점 제거 (e.g. "1.: 최우선" -> text가 ": 최우선"으로 잡히는 오염 방지)
        text = text.replace(/^[:.]\s*/, '').trim();

        choices.push({
          id: num,
          label: `${num}. ${text}`,
          text: `${num}번 선택: ${text}`
        });
      }
    });

    if (choices.length === 0 && !directChoice) {
      return { hasChoices: false, html: '' };
    }

    // [선택 안내] 삭제 및 요청 문구로 깔끔하게 교체
    if (!scenarioTitle || scenarioTitle.includes('선택 안내') || scenarioTitle === '💡') {
      scenarioTitle = '아래 보기 중 가장 가까운 마음 속 생각이나 반응을 골라주세요!';
    }

    if (!directChoice) {
      directChoice = { id: 6, placeholder: '보기에 없는 내 생각이나 상황을 적어주세요' };
    }

    if (!supplementObj) {
      supplementObj = { placeholder: '답변 일부 발췌, 재조립, 기타 메모를 자유롭게 입력' };
    }

    let choicesHtml = '';
    choices.forEach(ch => {
      choicesHtml += `
        <div class="choice-item-row" data-choice-id="${ch.id}" data-choice-text="${this.escapeHtml(ch.text)}">
          <input type="checkbox" class="choice-chk" id="chk-${msgId}-${ch.id}">
          <span class="choice-label-text">${this.parseInline(ch.label)} <span class="order-badge-placeholder" id="badge-${msgId}-${ch.id}"></span></span>
        </div>
      `;
    });

    // 6. 직접 입력 (일반 굵기 400 + 단일 밑줄)
    choicesHtml += `
      <div class="choice-item-row choice-row-direct" data-choice-id="6">
        <input type="checkbox" class="choice-chk" id="chk-${msgId}-6">
        <div style="flex: 1;">
          <span class="choice-label-text">6. 직접 입력 <span class="order-badge-placeholder" id="badge-${msgId}-6"></span></span>
          <div style="margin-top: 4px;">
            <textarea id="field-${msgId}-direct" class="single-underline-field field-direct" rows="1" placeholder="${this.escapeHtml(directChoice.placeholder)}"></textarea>
          </div>
        </div>
      </div>
    `;

    // 답변 보충 (단일 밑줄)
    const supplementHtml = `
      <div class="supplement-divider-box">
        <div class="supplement-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          <span>답변 보충</span>
        </div>
        <textarea id="field-${msgId}-supplement" class="single-underline-field field-supplement" rows="1" placeholder="${this.escapeHtml(supplementObj.placeholder)}"></textarea>
      </div>
    `;

    // 선택 완료 버튼 (컴팩트 & 완벽 중앙 정렬)
    const submitBtnHtml = `
      <div class="confirm-action-row">
        <button type="button" class="btn-submit-choice-compact" id="btn-submit-${msgId}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-check"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
          <span>선택 완료!</span>
        </button>
      </div>
    `;

    const html = `
      ${preambleHtml ? `<div class="ai-dialogue-body">${preambleHtml}</div>` : ''}
      <div class="integrated-quote-section" data-msg-id="${msgId}">
        <div class="quote-scenario-title">${this.parseInline(scenarioTitle)}</div>
        <div class="choices-list-container">
          ${choicesHtml}
        </div>
        ${supplementHtml}
        ${submitBtnHtml}
      </div>
    `;

    return { hasChoices: true, html };
  },

  // [신규] 심리학 첫 진입 시 전용 온보딩 선택 카드 (톤 2줄 옵션 + 닉네임 밑줄 + 첫 이야기 밑줄 + 선택완료)
  renderPsychologyOnboarding(msgId) {
    return `
      <div class="ai-dialogue-body">
        본격적으로 이야기를 시작하기 전에, 가장 편안한 대화 환경부터 맞춰볼게요!
      </div>
      <div class="integrated-quote-section onboarding-quote-section" data-msg-id="${msgId}">
        <!-- 1번 질문: 체크박스 없이, 아래에 2줄 옵션 체크박스 -->
        <div class="onboarding-question-block">
          <div class="onboarding-q-title">1. 어떤 대화 톤이 편하신가요?</div>
          <div class="onboarding-tone-options">
            <label class="choice-item-row onboarding-tone-row">
              <input type="radio" name="tone-${msgId}" class="choice-chk" value="친구처럼 거침없이 반말로 티키타카 하기">
              <span class="choice-label-text">친구처럼 거침없이 반말로 티키타카 하기</span>
            </label>
            <label class="choice-item-row onboarding-tone-row">
              <input type="radio" name="tone-${msgId}" class="choice-chk" value="적당히 위트 있고 편안한 존댓말 쓰기">
              <span class="choice-label-text">적당히 위트 있고 편안한 존댓말 쓰기</span>
            </label>
          </div>
        </div>

        <!-- 2번 질문: 체크박스 없이, 아래에 밑줄 입력창 -->
        <div class="onboarding-question-block" style="margin-top: 14px;">
          <div class="onboarding-q-title">2. 대화하는 동안 제가 어떤 호칭(닉네임)으로 불러드리면 좋을까요?</div>
          <div style="margin-top: 6px;">
            <textarea id="onboarding-nickname-${msgId}" class="single-underline-field" rows="1" placeholder="불러드릴 호칭(닉네임)"></textarea>
          </div>
        </div>

        <!-- 3번 질문: 체크박스 없이, 아래에 밑줄 입력창 -->
        <div class="onboarding-question-block" style="margin-top: 14px;">
          <div class="onboarding-q-title">3. 지금 머릿속에 가장 먼저 떠오르는 이야기 하나만 편하게 꺼내주세요!</div>
          <div style="margin-top: 6px;">
            <textarea id="onboarding-story-${msgId}" class="single-underline-field" rows="1" placeholder="재밌게 본 영화/유튜브, 직장/친구 일화, 취미, 고민 등"></textarea>
          </div>
        </div>

        <!-- 컴팩트 선택 완료 버튼 (직접 입력칸 및 답변 보충칸 완전 배제) -->
        <div class="confirm-action-row" style="margin-top: 16px;">
          <button type="button" class="btn-submit-choice-compact" id="btn-submit-onboarding-${msgId}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-check"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
            <span>선택 완료!</span>
          </button>
        </div>
      </div>
    `;
  },

  bindOnboardingEvents(containerEl, msgId) {
    const quoteSection = containerEl.querySelector(`.onboarding-quote-section[data-msg-id="${msgId}"]`);
    if (!quoteSection) return;

    const nicknameField = quoteSection.querySelector(`#onboarding-nickname-${msgId}`);
    const storyField = quoteSection.querySelector(`#onboarding-story-${msgId}`);
    const submitBtn = quoteSection.querySelector(`#btn-submit-onboarding-${msgId}`);

    const handleAutoResize = (textarea) => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    if (nicknameField) nicknameField.addEventListener('input', () => handleAutoResize(nicknameField));
    if (storyField) storyField.addEventListener('input', () => handleAutoResize(storyField));

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const checkedTone = quoteSection.querySelector(`input[name="tone-${msgId}"]:checked`);
        const toneVal = checkedTone ? checkedTone.value : '적당히 위트 있고 편안한 존댓말 쓰기';
        const nickVal = nicknameField ? nicknameField.value.trim() : '';
        const storyVal = storyField ? storyField.value.trim() : '';

        if (!storyVal) {
          alert('3번 질문에 머릿속에 떠오르는 이야기 하나만 편하게 적어주세요!');
          if (storyField) storyField.focus();
          return;
        }

        const lines = [
          `1. 대화 톤: ${toneVal}`,
          `2. 호칭(닉네임): ${nickVal || '편한 호칭으로 불러주세요'}`,
          `3. 첫 번째 이야기: ${storyVal}`
        ];

        // [핵심] 사용자 말풍선 없이 즉시 AI에게 페이로드 전송
        ChatManager.sendChoicePayload('psychology', lines.join('\n'));

        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.innerHTML = `<span>선택 반영됨 ✓</span>`;
      });
    }
  },

  bindChoiceEvents(containerEl, msgId) {
    const quoteSection = containerEl.querySelector(`.integrated-quote-section[data-msg-id="${msgId}"]`);
    if (!quoteSection) return;

    const orderedSelections = [];

    const updateBadges = () => {
      quoteSection.querySelectorAll('.order-badge-placeholder').forEach(el => {
        el.textContent = '';
        el.className = 'order-badge-placeholder';
      });

      orderedSelections.forEach((item, idx) => {
        const badgeEl = quoteSection.querySelector(`#badge-${msgId}-${item.id}`);
        if (badgeEl) {
          badgeEl.textContent = `${idx + 1}번째 선택`;
          badgeEl.className = 'order-badge-placeholder order-badge-clean';
        }
      });
    };

    const handleAutoResize = (textarea) => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    // 일반 선택지 클릭 핸들러
    quoteSection.querySelectorAll('.choice-item-row:not(.choice-row-direct)').forEach(row => {
      row.addEventListener('click', (e) => {
        const choiceId = parseInt(row.dataset.choiceId, 10);
        const choiceText = row.dataset.choiceText;
        const chk = row.querySelector('.choice-chk');

        if (e.target !== chk) {
          chk.checked = !chk.checked;
        }

        if (chk.checked) {
          if (!orderedSelections.some(item => item.id === choiceId)) {
            orderedSelections.push({ id: choiceId, text: choiceText });
          }
        } else {
          const idx = orderedSelections.findIndex(item => item.id === choiceId);
          if (idx !== -1) orderedSelections.splice(idx, 1);
        }

        updateBadges();
      });
    });

    // 6번 직접 입력 핸들러
    const directRow = quoteSection.querySelector('.choice-row-direct');
    const directChk = quoteSection.querySelector(`#chk-${msgId}-6`);
    const directField = quoteSection.querySelector(`#field-${msgId}-direct`);

    if (directRow && directChk && directField) {
      directRow.addEventListener('click', (e) => {
        if (e.target === directField) {
          if (!directChk.checked) {
            directChk.checked = true;
            if (!orderedSelections.some(item => item.id === 6)) {
              orderedSelections.push({ id: 6, isDirect: true });
            }
            updateBadges();
          }
          return;
        }

        if (e.target !== directChk) {
          directChk.checked = !directChk.checked;
        }

        if (directChk.checked) {
          if (!orderedSelections.some(item => item.id === 6)) {
            orderedSelections.push({ id: 6, isDirect: true });
          }
          directField.focus();
        } else {
          const idx = orderedSelections.findIndex(item => item.id === 6);
          if (idx !== -1) orderedSelections.splice(idx, 1);
        }

        updateBadges();
      });

      directField.addEventListener('input', () => {
        handleAutoResize(directField);
        if (directField.value.trim().length > 0 && !directChk.checked) {
          directChk.checked = true;
          if (!orderedSelections.some(item => item.id === 6)) {
            orderedSelections.push({ id: 6, isDirect: true });
          }
          updateBadges();
        }
      });
    }

    // 답변 보충 자동 늘어남
    const suppField = quoteSection.querySelector(`#field-${msgId}-supplement`);
    if (suppField) {
      suppField.addEventListener('input', () => handleAutoResize(suppField));
    }

    // 선택 완료 전송
    const submitBtn = quoteSection.querySelector(`#btn-submit-${msgId}`);
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const lines = [];

        orderedSelections.forEach(item => {
          if (item.isDirect) {
            const val = directField ? directField.value.trim() : '';
            lines.push(val ? `6번 선택: 직접 입력 ${val}` : `6번 선택: 직접 입력`);
          } else {
            lines.push(item.text);
          }
        });

        const suppVal = suppField ? suppField.value.trim() : '';
        if (suppVal) {
          lines.push(`답변 보충\n${suppVal}`);
        }

        if (lines.length === 0) {
          alert('선택지를 최소 1개 이상 선택하거나 텍스트를 입력해주세요!');
          return;
        }

        const payloadText = lines.join('\n');
        // [핵심] 사용자 말풍선 없이 즉시 AI에게 페이로드 전송
        ChatManager.sendChoicePayload('psychology', payloadText);

        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.innerHTML = `<span>선택 반영됨 ✓</span>`;
      });
    }
  }
};

// 9-B. Firebase Vertex AI (AI Logic) & App Check 연동 엔진 (VertexManager)
const VertexManager = {
  appInstance: null,
  vertexInstance: null,
  appCheckInstance: null,
  currentConfigKey: null,

  // 사용자가 입력한 다양한 포맷(JSON, JS 리터럴, <script> 스니펫 등)에서 설정값 지능형 추출
  parseConfig(configStr, explicitSiteKey = '', explicitType = '') {
    if ((!configStr || typeof configStr !== 'string') && !explicitSiteKey) return null;
    const str = (configStr || '').trim();

    let parsed = {};
    try {
      if (str.startsWith('{') && str.endsWith('}')) {
        parsed = JSON.parse(str);
      }
    } catch (e) {}

    const extract = (key) => {
      if (parsed[key]) return String(parsed[key]).trim();
      const m = str.match(new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`, 'i'));
      return m ? m[1].trim() : '';
    };

    const apiKey = extract('apiKey') || extract('api_key');
    const projectId = extract('projectId') || extract('project_id');
    const appId = extract('appId') || extract('app_id');
    const authDomain = extract('authDomain');
    const storageBucket = extract('storageBucket');
    const messagingSenderId = extract('messagingSenderId');
    const location = extract('location') || 'us-central1';

    // reCAPTCHA Enterprise / v3 키 감지 (명시적 입력란 값 우선, 없으면 스니펫에서 추출)
    let recaptchaSiteKey = (explicitSiteKey || '').trim() || extract('recaptchaSiteKey') || extract('siteKey') || extract('recaptchaKey');
    let isEnterprise = explicitType === 'v3' ? false : true;

    const entMatch = str.match(/ReCaptchaEnterpriseProvider\s*\(\s*["']([^"']+)["']/i);
    const v3Match = str.match(/ReCaptchaV3Provider\s*\(\s*["']([^"']+)["']/i);
    const rawKeyMatch = str.match(/["'](6L[a-zA-Z0-9_-]{38})["']/);

    if (entMatch) {
      if (!recaptchaSiteKey) recaptchaSiteKey = entMatch[1].trim();
      isEnterprise = true;
    } else if (v3Match) {
      if (!recaptchaSiteKey) recaptchaSiteKey = v3Match[1].trim();
      isEnterprise = false;
    } else if (rawKeyMatch && !recaptchaSiteKey) {
      recaptchaSiteKey = rawKeyMatch[1].trim();
      isEnterprise = !str.includes('ReCaptchaV3Provider');
    }

    if (!projectId && !apiKey) return null;

    return {
      apiKey,
      projectId,
      appId,
      authDomain,
      storageBucket,
      messagingSenderId,
      location,
      recaptchaSiteKey,
      isEnterprise
    };
  },

  // Firebase 및 App Check 초기화
  async init(config) {
    if (!config || !config.projectId) {
      throw new Error('Firebase Project ID를 찾을 수 없습니다. Vertex AI 스크립트 또는 설정을 확인해 주세요.');
    }

    const configKey = `${config.projectId}_${config.apiKey}_${config.recaptchaSiteKey || ''}_${config.isEnterprise}`;
    if (this.appInstance && this.currentConfigKey !== configKey) {
      const { deleteApp } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js");
      await deleteApp(this.appInstance).catch(() => {});
      this.appInstance = null;
      this.appCheckInstance = null;
      this.vertexInstance = null;
    }

    if (this.vertexInstance && this.currentConfigKey === configKey) {
      return { app: this.appInstance, vertex: this.vertexInstance, appCheck: this.appCheckInstance };
    }

    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js");
    const { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-app-check.js");
    const { getVertexAI } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-vertexai.js");

    const appName = 'AboutMeVertexApp';
    let app;
    const existingApps = getApps();
    const found = existingApps.find(a => a.name === appName);
    if (found) {
      app = found;
    } else {
      const firebaseConfig = {
        apiKey: config.apiKey,
        projectId: config.projectId,
        appId: config.appId || `1:${config.messagingSenderId || '123'}:web:aboutme`,
        authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
        storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
        messagingSenderId: config.messagingSenderId || ''
      };
      app = initializeApp(firebaseConfig, appName);
    }

    // App Check 연동 (사용자가 설정한 reCAPTCHA 키 활성화)
    let appCheck = null;
    if (config.recaptchaSiteKey && !this.appCheckInstance) {
      try {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }
        const provider = config.isEnterprise !== false
          ? new ReCaptchaEnterpriseProvider(config.recaptchaSiteKey)
          : new ReCaptchaV3Provider(config.recaptchaSiteKey);

        appCheck = initializeAppCheck(app, {
          provider: provider,
          isTokenAutoRefreshEnabled: true
        });
        this.appCheckInstance = appCheck;
        console.log('[Firebase App Check] 초기화 완료:', config.recaptchaSiteKey.substring(0, 8) + '...');
      } catch (acErr) {
        console.warn('[Firebase App Check 초기화 경고]:', acErr);
      }
    }

    const vertex = getVertexAI(app, { location: config.location || 'us-central1' });
    this.appInstance = app;
    this.vertexInstance = vertex;
    this.currentConfigKey = configKey;

    return { app, vertex, appCheck: this.appCheckInstance };
  },

  cachedTokenData: null,

  // App Check 토큰 발급 및 진단 (7일 장기 유효기간 로컬 영구 캐싱)
  async getAppCheckToken(forceRefresh = false) {
    if (!this.appCheckInstance) return null;

    const now = Date.now();
    // 1. 메모리 캐시 확인 (만료 1분 전까지 재사용)
    if (!forceRefresh && this.cachedTokenData && this.cachedTokenData.expiresAt > now + 60000) {
      console.log('[Firebase App Check] 메모리 캐시 토큰 사용 (유효기간 잔여:', Math.round((this.cachedTokenData.expiresAt - now) / 1000 / 60 / 60), '시간)');
      return this.cachedTokenData.token;
    }

    // 2. IndexedDB 영구 저장소 캐시 확인
    try {
      if (!forceRefresh) {
        const saved = await DB.get('settings', 'app_check_cached_token');
        if (saved?.value?.token && saved.value.expiresAt > now + 60000) {
          this.cachedTokenData = saved.value;
          console.log('[Firebase App Check] 저장소 캐시 토큰 복원 (만료일:', new Date(saved.value.expiresAt).toLocaleDateString(), ')');
          return saved.value.token;
        }
      }
    } catch (e) {}

    // 3. 신규 토큰 발급 및 7일 유효기간 영구 캐싱
    try {
      const { getToken } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-app-check.js");
      const tokenResult = await getToken(this.appCheckInstance, forceRefresh);
      if (tokenResult?.token) {
        // Firebase 설정 만료시간 또는 7일(7 * 24 * 60 * 60 * 1000ms) 캐시 적용
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const expiresAt = tokenResult.expireTimeMillis || (now + sevenDaysMs);
        const tokenData = {
          token: tokenResult.token,
          expiresAt: expiresAt,
          savedAt: now
        };
        this.cachedTokenData = tokenData;
        await DB.set('settings', { id: 'app_check_cached_token', value: tokenData, updatedAt: now }).catch(() => {});
        console.log('[Firebase App Check] 7일 유효기간 토큰 저장 완료');
        return tokenResult.token;
      }
      return null;
    } catch (err) {
      console.warn('[Firebase App Check 토큰 발급 오류]:', err);
      const msg = err.message || '';
      if (msg.includes('domain') || msg.includes('Domain') || msg.includes('origin') || msg.includes('Origin') || msg.includes('network') || msg.includes('recaptcha')) {
        throw new Error(`reCAPTCHA 도메인 불일치: 현재 접속 주소(${window.location.hostname})가 Google reCAPTCHA 콘솔의 [도메인 허용 목록]에 등록되어 있지 않습니다. reCAPTCHA 콘솔에서 '${window.location.hostname}' (또는 'run.app')을 도메인 목록에 추가해 주세요.`);
      }
      throw err;
    }
  },

  // Firebase Vertex AI 통신 요청 (스트리밍 및 배치 공통 지원)
  async sendRequest({ config, modelName, payload, isStream, onChunk, onComplete }) {
    const { vertex } = await this.init(config);
    const { getGenerativeModel } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-vertexai.js");

    // Firebase Vertex AI가 정식 지원하는 모델명으로 안전 매핑 (3.x 프리뷰는 2.5-flash로 호환)
    let cleanModel = modelName.replace(/^models\//, '');
    if (cleanModel.startsWith('gemini-3')) {
      cleanModel = 'gemini-2.5-flash';
    }

    const modelConfig = {
      model: cleanModel,
      generationConfig: {
        temperature: payload.generationConfig?.temperature ?? 0.7
      },
      safetySettings: payload.safetySettings || []
    };

    if (payload.systemInstruction?.parts?.[0]?.text) {
      modelConfig.systemInstruction = payload.systemInstruction.parts[0].text;
    } else if (typeof payload.systemInstruction === 'string' && payload.systemInstruction) {
      modelConfig.systemInstruction = payload.systemInstruction;
    }

    const model = getGenerativeModel(vertex, modelConfig);

    if (isStream) {
      const result = await model.generateContentStream({ contents: payload.contents });
      let accumulatedText = '';
      for await (const chunk of result.stream) {
        let text = '';
        try {
          text = chunk.text();
        } catch (e) {
          const parts = chunk.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if (!p.thought && p.text) text += p.text;
          }
        }
        if (text) {
          accumulatedText += text;
          if (onChunk) onChunk(accumulatedText, text);
        }
      }
      if (onComplete) onComplete(accumulatedText);
      return accumulatedText;
    } else {
      const result = await model.generateContent({ contents: payload.contents });
      let finalText = '';
      try {
        finalText = result.response.text();
      } catch (e) {
        const parts = result.response?.candidates?.[0]?.content?.parts || [];
        finalText = parts.map(p => p.text || '').join('');
      }
      if (!finalText) finalText = '답변을 생성하지 못했습니다.';
      if (onComplete) onComplete(finalText);
      return finalText;
    }
  }
};

// 10. AI 멀티모달 통신 엔진 (AIEngine)
const AIEngine = {
  // Base64 Data URL에서 MIME 타입과 순수 바이너리 데이터 안전 추출
  extractBase64(dataUrl) {
    if (!dataUrl) return { mimeType: 'image/jpeg', data: '' };
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx !== -1 && dataUrl.startsWith('data:')) {
      const mime = dataUrl.slice(5, commaIdx).split(';')[0] || 'image/jpeg';
      const base64 = dataUrl.slice(commaIdx + 1).replace(/\s/g, '');
      return { mimeType: mime, data: base64 };
    }
    return { mimeType: 'image/jpeg', data: dataUrl.replace(/\s/g, '') };
  },

  // 멀티모달 페이로드 빌더 (프라이버시 엄수: 이름 제외, 이미지만 패키징 & Multiturn 교차 순서 강제)
  async buildContents(history, userText, attachedProfiles = []) {
    const contents = [];

    // 1. 유효한 텍스트만 필터링 (오류 메시지 및 빈 메시지 완전 배제)
    const validHistory = (history || [])
      .filter(msg => msg && msg.content && typeof msg.content === 'string' && msg.content.trim() && !msg.content.startsWith('⚠️'))
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content.trim() }]
      }));

    // 2. Gemini Multiturn 규칙 강제: 첫 번째 항목은 무조건 'user'여야 함 (model 시작 금지)
    while (validHistory.length > 0 && validHistory[0].role !== 'user') {
      validHistory.shift();
    }

    // 3. Gemini Multiturn 규칙 강제: user와 model이 번갈아 교차해야 함 (동일 role 연속 시 병합)
    const alternatingHistory = [];
    for (const turn of validHistory) {
      if (alternatingHistory.length === 0) {
        alternatingHistory.push(turn);
      } else {
        const lastTurn = alternatingHistory[alternatingHistory.length - 1];
        if (lastTurn.role === turn.role) {
          lastTurn.parts[0].text += '\n\n' + turn.parts[0].text;
        } else {
          alternatingHistory.push(turn);
        }
      }
    }

    // 4. 새 사용자 턴이 추가될 예정이므로, history의 마지막 턴이 user라면 제거 (미응답 잔여 턴 정리)
    if (alternatingHistory.length > 0 && alternatingHistory[alternatingHistory.length - 1].role === 'user') {
      alternatingHistory.pop();
    }

    contents.push(...alternatingHistory);

    // 현재 사용자 턴 조립
    const currentParts = [];

    // [핵심] 첨부된 명식 이미지가 있는 경우 이름은 완전히 제외하고 순수 이미지 바이너리만 첨부 (대용량 압축 보장)
    if (attachedProfiles && attachedProfiles.length > 0) {
      for (const profile of attachedProfiles) {
        let rawData = profile.imageData;
        if (rawData && rawData.length > 500000) {
          rawData = await SajuManager.compressDataUrl(rawData);
        }
        const { mimeType, data } = this.extractBase64(rawData);
        if (data) {
          currentParts.push({
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: data
            }
          });
        }
      }
    }

    // 사용자 텍스트 질문 추가
    currentParts.push({ text: userText });
    contents.push({ role: 'user', parts: currentParts });

    return contents;
  },

  // AI 응답 요청 실행
  async sendRequest({ category, userText, history, attachedProfiles, onChunk, onComplete, onError }) {
    try {
      // 1. 설정 및 프롬프트 로드
      const geminiSetting = await DB.get('settings', 'gemini_api_key');
      const vertexSetting = await DB.get('settings', 'vertex_config');
      const recaptchaSetting = await DB.get('settings', 'recaptcha_site_key');
      const recaptchaTypeSetting = await DB.get('settings', 'recaptcha_type');
      const generalSetting = await DB.get('settings', 'general_settings');
      const promptData = await DB.get('prompts', category);

      const apiKey = geminiSetting?.value?.trim() || '';
      const vertexConfigStr = vertexSetting?.value?.trim() || '';
      const explicitRecaptchaKey = recaptchaSetting?.value?.trim() || '';
      const explicitRecaptchaType = recaptchaTypeSetting?.value || 'enterprise';

      const parsedVertexConfig = VertexManager.parseConfig(vertexConfigStr, explicitRecaptchaKey, explicitRecaptchaType);
      const outputMode = generalSetting?.outputMode || 'stream';
      let systemInstruction = promptData?.content?.trim() || '';

      if (!systemInstruction) {
        if (category === 'psychology') {
          systemInstruction = `당신은 사용자의 심리를 깊이 이해하고 통찰을 제공하는 전문 심리 분석가 'ABOUT ME'입니다. 따뜻하고 편안한 어조로 대화하며, 사용자가 편안하게 자신의 내면, 감정, 무의식, 생각 패턴을 털어놓을 수 있도록 이끌어주세요. 필요 시 [REPORT_START] ... [REPORT_END] 태그를 사용하여 정밀 심리 분석 보고서를 함께 제공할 수 있습니다.`;
        } else if (category === 'saju') {
          systemInstruction = `당신은 명리학(만세력 및 사주 원국) 심층 분석 전문가 'ABOUT ME'입니다. 만세력 이미지와 질문을 바탕으로 음양오행의 균형, 십신, 격국, 용신, 대운의 흐름을 전문적이면서도 알기 쉽게 풀이합니다. 필요 시 [REPORT_START] ... [REPORT_END] 태그를 사용하여 구조화된 명식 분석 보고서를 작성하세요.`;
        }
      }

      // 2. 페이로드 생성 (비동기 이미지 안전 압축 포함)
      const contents = await this.buildContents(history, userText, attachedProfiles);
      const payload = {
        contents: contents,
        generationConfig: {
          temperature: 0.7
        }
      };

      // 생각 깊이 (Reasoning) 설정 적용
      const reasoningMode = generalSetting?.reasoning || 'medium';
      const customBudget = parseInt(generalSetting?.reasoningBudget, 10);
      let thinkingBudget = 0;
      if (reasoningMode === 'off') {
        thinkingBudget = 0;
      } else if (reasoningMode === 'minimal') {
        thinkingBudget = 256;
      } else if (reasoningMode === 'low') {
        thinkingBudget = 1024;
      } else if (reasoningMode === 'medium') {
        thinkingBudget = 2048;
      } else if (reasoningMode === 'high') {
        thinkingBudget = 4096;
      } else if (reasoningMode === 'budget') {
        thinkingBudget = !isNaN(customBudget) && customBudget > 0 ? customBudget : 2048;
      }

      payload.generationConfig.thinkingConfig = {
        thinkingBudget: thinkingBudget
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      // 3. 설정된 모델명 및 안전필터 Payload 결합
      const modelName = generalSetting?.model || 'gemini-2.5-flash';
      const safety = generalSetting?.safety || {};

      payload.safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: safety.harassment || 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: safety.hate || 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: safety.sex || 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: safety.danger || 'BLOCK_NONE' }
      ];

      const isStream = outputMode === 'stream';
      const cleanModel = modelName.replace(/^models\//, '');
      const action = isStream ? 'streamGenerateContent?alt=sse' : 'generateContent';
      const sep = action.includes('?') ? '&' : '?';

      let response;

      // [핵심 분기 1] Gemini API 키가 없고 Firebase Vertex AI (AI Logic) 설정이 입력되어 있는 경우
      if (!apiKey && parsedVertexConfig) {
        try {
          console.log('[AIEngine] Firebase Vertex AI & App Check 모드로 응답을 생성합니다.');
          await VertexManager.sendRequest({
            config: parsedVertexConfig,
            modelName: cleanModel,
            payload: payload,
            isStream: isStream,
            onChunk: onChunk,
            onComplete: onComplete
          });
          return;
        } catch (vertexErr) {
          console.warn('[Firebase Vertex AI 호출 실패]:', vertexErr);
          const vMsg = vertexErr.message || '';
          if (vMsg.includes('reCAPTCHA') || vMsg.includes('도메인')) {
            throw vertexErr;
          }

          // 만약 Firebase SDK 호출이 실패했으나 firebaseConfig 안에 apiKey가 있는 경우 Google Direct Gemini API로 완벽 폴백
          if (parsedVertexConfig.apiKey) {
            console.log('[AIEngine] Firebase Config 내 apiKey로 Google API 직접 통신을 재시도합니다.');
            const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:${action}${sep}key=${parsedVertexConfig.apiKey}`;
            const reqHeaders = {
              'Content-Type': 'application/json',
              'x-goog-api-key': parsedVertexConfig.apiKey
            };

            const appCheckToken = await VertexManager.getAppCheckToken().catch(() => null);
            if (appCheckToken) {
              reqHeaders['X-Firebase-AppCheck'] = appCheckToken;
            }

            const directRes = await fetch(directUrl, {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify(payload)
            });

            if (directRes.ok) {
              response = directRes;
            } else {
              const errData = await directRes.json().catch(() => ({}));
              const dMsg = errData.error?.message || '';
              throw new Error(`Firebase Vertex AI 오류: ${vertexErr.message}${dMsg ? ` (원인: ${dMsg})` : ''}`);
            }
          } else {
            throw new Error(`Firebase Vertex AI 오류: ${vertexErr.message}`);
          }
        }
      }

      // [핵심 분기 2] Gemini API 키가 등록되어 있는 경우: 프록시 우선 시도 후 404/405/네트워크 오류 시 Google 다이렉트 API로 완벽 폴백
      if (apiKey) {
        try {
          response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-gemini-key': apiKey
            },
            body: JSON.stringify({
              modelName: cleanModel,
              payload: payload,
              stream: isStream
            })
          });

          // 정적 호스팅(Cloud CDN/GCS 등)에서 POST 요청 시 405 발생하거나 프록시가 없는 404인 경우
          if (response.status === 405 || response.status === 404) {
            const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:${action}${sep}key=${apiKey}`;
            response = await fetch(directUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }
        } catch (fetchErr) {
          // 프록시 네트워크 실패 시 클라이언트에서 직접 Google Gemini API 호출
          const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:${action}${sep}key=${apiKey}`;
          response = await fetch(directUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      } else if (!parsedVertexConfig) {
        // [핵심 분기 3] API 키도 없고 Vertex AI 설정도 없는 경우: 서버 프록시 호출 시도 또는 친절한 안내
        try {
          response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              modelName: cleanModel,
              payload: payload,
              stream: isStream
            })
          });
        } catch (proxyErr) {
          throw new Error('대화를 시작하려면 좌측 [설정] 메뉴에서 Gemini API 키 또는 Firebase Vertex AI 스크립트를 입력해 주세요.');
        }

        if (response.status === 405 || response.status === 404) {
          throw new Error('대화를 시작하려면 좌측 [설정] 메뉴에서 Gemini API 키 또는 Firebase Vertex AI 스크립트를 입력해 주세요.');
        }
      }

      // ThinkingConfig 호환성 문제 시 재시도
      if (!response.ok && payload?.generationConfig?.thinkingConfig) {
        try {
          const errClone = await response.clone().json().catch(() => ({}));
          const errMsg = errClone.error?.message || '';
          if (errMsg.toLowerCase().includes('thinking') || errMsg.toLowerCase().includes('budget')) {
            const retryPayload = JSON.parse(JSON.stringify(payload));
            delete retryPayload.generationConfig.thinkingConfig;
            if (apiKey) {
              const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:${action}${sep}key=${apiKey}`;
              response = await fetch(directUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(retryPayload)
              });
            }
          }
        } catch (e) {
          // Ignore retry error and use original
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message;
        if (response.status === 400 && (!apiKey || msg?.includes('API key'))) {
          throw new Error('Gemini API 키가 유효하지 않거나 등록되지 않았습니다. 좌측 서랍의 [설정] 메뉴에서 API 키를 입력해 주세요.');
        }
        throw new Error(msg || `통신 오류 (상태 코드: ${response.status})`);
      }

      // 4-A. 일시 출력 (Batch) 방식
      if (!isStream) {
        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        let text = '';
        for (const p of parts) {
          if (!p.thought && p.text) {
            text += p.text;
          }
        }
        if (!text && parts.length > 0) {
          text = parts.map(p => p.text || '').join('');
        }
        if (!text) text = '답변을 생성하지 못했습니다.';
        if (onComplete) onComplete(text);
        return;
      }

      // 4-B. 스트리밍 (Stream SSE) 방식
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 미완성된 마지막 줄 보존

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.substring(6);
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const parts = parsed.candidates?.[0]?.content?.parts || [];
              let chunk = '';
              for (const p of parts) {
                if (!p.thought && p.text) {
                  chunk += p.text;
                }
              }
              if (chunk) {
                accumulatedText += chunk;
                if (onChunk) onChunk(accumulatedText, chunk);
              }
            } catch (err) {
              // 불완전 JSON 패킷 무시
            }
          }
        }
      }

      // 스트림 완료 후 잔여 버퍼 최종 파싱 (마지막 문장 누락 방지)
      if (buffer && buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.substring(6);
          if (jsonStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(jsonStr);
              const parts = parsed.candidates?.[0]?.content?.parts || [];
              let chunk = '';
              for (const p of parts) {
                if (!p.thought && p.text) chunk += p.text;
              }
              if (chunk) {
                accumulatedText += chunk;
                if (onChunk) onChunk(accumulatedText, chunk);
              }
            } catch (err) {}
          }
        }
      }

      if (onComplete) onComplete(accumulatedText);

    } catch (error) {
      console.error('[AIEngine 오류]:', error);
      if (onError) onError(error.message || '요청 처리 중 오류가 발생했습니다.');
    }
  }
};

// 9. 전체화면 보고서 오버레이 관리자 (ReportController)
const ReportController = {
  view: document.getElementById('report-fullscreen-view'),
  body: document.getElementById('report-body-content'),
  isOpen: false,

  open(reportRawText) {
    if (this.isOpen) return;
    this.isOpen = true;

    // 보고서 마크다운 파싱 렌더링
    this.body.innerHTML = MarkdownParser.parse(reportRawText);
    this.view.classList.remove('hidden');

    // 뒤로가기 스택에 보고서 닫기 등록 (모바일 뒤로가기 시 1단계 닫힘 보장)
    NavStack.push({
      id: 'report-fullscreen-view',
      onClose: () => this.close(false)
    });
  },

  close(triggerBack = true) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.view.classList.add('hidden');
    this.body.innerHTML = '';

    // 이전 대화 뷰 화면 표시 유지 보장
    if (Router.currentView === 'chat') {
      const chatView = document.getElementById('view-chat');
      if (chatView) chatView.classList.remove('hidden');
    }

    if (triggerBack) {
      NavStack.pop();
    }
  }
};

// 13. Firestore 1MB 슬라이스 분할 백업/복원 엔진 (CloudBackupManager)
const CloudBackupManager = {
  // 사용자가 입력한 Firebase Config 텍스트에서 projectId와 apiKey 추출
  parseFirebaseConfig(configStr) {
    if (!configStr) return null;
    try {
      // 1. 순수 JSON 형식 시도
      const parsed = JSON.parse(configStr);
      if (parsed.projectId && parsed.apiKey) return parsed;
    } catch (e) {
      // 2. JS 객체 리터럴 형식 정규식 추출 시도
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

  // 전체 IndexedDB 데이터 패키징 (API 설정, 프롬프트, 명식 이미지, 대화 내역 전체)
  async exportFullDatabase() {
    const dump = {
      prompts: await DB.getAll('prompts'),
      settings: await DB.getAll('settings'),
      saju_profiles: await DB.getAll('saju_profiles'),
      chat_sessions: await DB.getAll('chat_sessions'),
      chat_messages: await DB.getAll('chat_messages'),
      exportedAt: Date.now()
    };
    return JSON.stringify(dump);
  },

  // 1MB 제한 극복: 문자열을 800KB(약 800,000자) 안전 크기로 분할
  sliceIntoChunks(str, chunkSize = 750000) {
    const chunks = [];
    let i = 0;
    while (i < str.length) {
      chunks.push(str.slice(i, i + chunkSize));
      i += chunkSize;
    }
    return chunks;
  },

  // 클라우드 백업 실행
  async backup() {
    const firestoreSetting = await DB.get('settings', 'firestore_config');
    const config = this.parseFirebaseConfig(firestoreSetting?.value);

    if (!config || !config.projectId || !config.apiKey) {
      alert('Firestore 설정이 비어있거나 올바르지 않습니다.\n좌측 서랍 ➔ [설정] ➔ [Firestore] 탭에 Firebase Config를 먼저 입력해 주세요.');
      return;
    }

    const backupKey = prompt('백업에 사용할 고유 복원 코드(비밀번호)를 입력하세요.\n(다른 기기에서 이 코드로 복원합니다):');
    if (!backupKey || !backupKey.trim()) return;
    const cleanKey = encodeURIComponent(backupKey.trim());

    try {
      // 1. 전체 로컬 DB 패키징 및 슬라이스 분할
      const fullJson = await this.exportFullDatabase();
      const chunks = this.sliceIntoChunks(fullJson);
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;

      // 2. 메타데이터 문서 저장
      const metaUrl = `${baseUrl}/about_me_backups/${cleanKey}?key=${config.apiKey}`;
      const metaPayload = {
        fields: {
          totalChunks: { integerValue: chunks.length.toString() },
          totalBytes: { integerValue: fullJson.length.toString() },
          createdAt: { timestampValue: new Date().toISOString() }
        }
      };

      const metaRes = await fetch(metaUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metaPayload)
      });

      if (!metaRes.ok) {
        throw new Error(`메타데이터 저장 실패 (상태 코드: ${metaRes.status})`);
      }

      // 3. 분할된 청크 순차 업로드
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunkUrl = `${baseUrl}/about_me_backups/${cleanKey}/chunks/part_${idx}?key=${config.apiKey}`;
        const chunkPayload = {
          fields: {
            chunkIndex: { integerValue: idx.toString() },
            data: { stringValue: chunks[idx] }
          }
        };

        const chunkRes = await fetch(chunkUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunkPayload)
        });

        if (!chunkRes.ok) {
          throw new Error(`청크 ${idx + 1}/${chunks.length} 업로드 실패`);
        }
      }

      alert(`✅ 백업이 성공적으로 완료되었습니다!\n총 ${chunks.length}개의 조각으로 안전하게 분할 저장되었습니다.\n복원 코드: ${backupKey.trim()}`);
    } catch (err) {
      console.error('[백업 오류]:', err);
      alert(`⚠️ 백업 실패: ${err.message}`);
    }
  },

  // 클라우드 복원 실행
  async restore() {
    const firestoreSetting = await DB.get('settings', 'firestore_config');
    const config = this.parseFirebaseConfig(firestoreSetting?.value);

    if (!config || !config.projectId || !config.apiKey) {
      alert('Firestore 설정이 비어있거나 올바르지 않습니다.\n좌측 서랍 ➔ [설정] ➔ [Firestore] 탭에 Firebase Config를 먼저 입력해 주세요.');
      return;
    }

    const backupKey = prompt('복원할 백업 고유 코드(비밀번호)를 입력하세요:');
    if (!backupKey || !backupKey.trim()) return;
    const cleanKey = encodeURIComponent(backupKey.trim());

    try {
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;

      // 1. 메타데이터 조회
      const metaUrl = `${baseUrl}/about_me_backups/${cleanKey}?key=${config.apiKey}`;
      const metaRes = await fetch(metaUrl);

      if (!metaRes.ok) {
        throw new Error('해당 복원 코드의 백업 데이터를 찾을 수 없습니다.');
      }

      const metaData = await metaRes.json();
      const totalChunks = parseInt(metaData.fields?.totalChunks?.integerValue || '1', 10);

      // 2. 분할 청크 순차 다운로드 및 병합
      let reconstructedJson = '';
      for (let idx = 0; idx < totalChunks; idx++) {
        const chunkUrl = `${baseUrl}/about_me_backups/${cleanKey}/chunks/part_${idx}?key=${config.apiKey}`;
        const chunkRes = await fetch(chunkUrl);

        if (!chunkRes.ok) {
          throw new Error(`청크 ${idx + 1}/${totalChunks} 복원 실패`);
        }

        const chunkData = await chunkRes.json();
        const partText = chunkData.fields?.data?.stringValue || '';
        reconstructedJson += partText;
      }

      // 3. JSON 역직렬화 및 IndexedDB 트랜잭션 복원
      const restored = JSON.parse(reconstructedJson);

      if (restored.prompts) {
        for (const item of restored.prompts) await DB.set('prompts', item);
      }
      if (restored.settings) {
        for (const item of restored.settings) await DB.set('settings', item);
      }
      if (restored.saju_profiles) {
        for (const item of restored.saju_profiles) await DB.set('saju_profiles', item);
      }
      if (restored.chat_sessions) {
        for (const item of restored.chat_sessions) await DB.set('chat_sessions', item);
      }
      if (restored.chat_messages) {
        for (const item of restored.chat_messages) await DB.set('chat_messages', item);
      }

      // 4. UI 최신화
      await SajuManager.renderProfilesList();
      await SessionManager.renderSessionList('psychology');
      await SessionManager.renderSessionList('saju');

      alert('🎉 모든 데이터(API 설정, 프롬프트, 만세력 사진, 대화 기록)가 완벽하게 복원되었습니다!');
      location.reload(); // 복원된 최신 환경으로 완전 새로고침
    } catch (err) {
      console.error('[복원 오류]:', err);
      alert(`⚠️ 복원 실패: ${err.message}`);
    }
  }
};

// 12. 대화 세션 및 기록 저장소 관리자 (SessionManager)
const SessionManager = {
  deleteMode: { psychology: false, saju: false },
  selectedForDeletion: { psychology: new Set(), saju: new Set() },

  async toggleDeleteMode(category) {
    const isCurrentlyDeleting = this.deleteMode[category];
    const btn = document.getElementById(category === 'psychology' ? 'btn-delete-mode-psych' : 'btn-delete-mode-saju');

    if (!isCurrentlyDeleting) {
      // 1. 삭제 모드 진입
      this.deleteMode[category] = true;
      this.selectedForDeletion[category].clear();
      if (btn) btn.classList.add('active');
      await this.renderSessionList(category);
    } else {
      // 2. 삭제 모드 상태에서 재클릭 -> 실제 삭제 실행
      const targets = Array.from(this.selectedForDeletion[category]);
      if (targets.length > 0) {
        if (confirm(`선택한 ${targets.length}개의 대화를 완전히 삭제하시겠습니까?`)) {
          for (const sessId of targets) {
            await DB.delete('chat_sessions', sessId);
            const msgs = await DB.getByIndex('chat_messages', 'sessionId', sessId);
            for (const m of msgs) await DB.delete('chat_messages', m.id);
            if (ChatManager.currentSessionId === sessId) {
              ChatManager.currentSessionId = null;
              ChatManager.activeHistory = [];
            }
          }
        }
      }
      this.deleteMode[category] = false;
      this.selectedForDeletion[category].clear();
      if (btn) btn.classList.remove('active');
      await this.renderSessionList(category);
    }
  },

  generateDefaultTitle() {
    const now = new Date();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const h = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    return `${m}.${d} ${h}:${min} 대화`;
  },

  async createNewSession(category) {
    const sessionId = `session_${category}_${Date.now()}`;
    const newSession = {
      id: sessionId,
      category: category,
      title: this.generateDefaultTitle(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await DB.set('chat_sessions', newSession);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('about_me_active_session_id', sessionId);
        localStorage.setItem('about_me_active_view', category);
      }
    } catch (e) {}
    await this.renderSessionList(category);
    return newSession;
  },

  async loadSession(sessionId) {
    const session = await DB.get('chat_sessions', sessionId);
    if (!session) return;

    ChatManager.currentSessionId = session.id;
    ChatManager.activeHistory = [];

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('about_me_active_session_id', session.id);
        localStorage.setItem('about_me_active_view', session.category);
      }
    } catch (e) {}

    const isPsychology = session.category === 'psychology';
    const containerId = isPsychology ? 'psychology-chat-messages' : 'saju-chat-messages';
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    Router.navigate(session.category);

    const messages = await DB.getByIndex('chat_messages', 'sessionId', sessionId);
    messages.sort((a, b) => a.timestamp - b.timestamp);

    let hasReport = false;
    if (messages.length === 0) {
      // 대화가 없는 빈 세션인 경우 첫 안내 인사말을 화면에 반드시 출력
      if (INITIAL_GREETINGS[session.category]) {
        ChatUI.appendMessage(containerId, 'model', INITIAL_GREETINGS[session.category], null, true);
      }
    } else {
      messages.forEach(msg => {
        // [핵심] silent 표시된 선택지 전송 사용자 메시지는 화면 말풍선 생략
        if (msg.role === 'user' && msg.silent) {
          ChatManager.activeHistory.push({ id: msg.id, role: msg.role, content: msg.content, silent: true });
          return;
        }
        ChatUI.appendMessage(containerId, msg.role, msg.content, msg.id, msg.isGreeting);
        ChatManager.activeHistory.push({ id: msg.id, role: msg.role, content: msg.content });
        if (msg.role === 'model' && MarkdownParser.extractReport(msg.content).hasReport) {
          hasReport = true;
        }
      });
    }

    if (isPsychology) {
      const psychInputBar = document.getElementById('psychology-input-bar');
      if (psychInputBar) {
        if (hasReport) {
          psychInputBar.classList.remove('hidden');
        } else {
          psychInputBar.classList.add('hidden');
        }
      }
    }

    await this.renderSessionList(session.category);
  },

  async saveMessage(sessionId, role, content) {
    if (!sessionId) return;
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await DB.set('chat_messages', {
      id: msgId,
      sessionId: sessionId,
      role: role,
      content: content,
      timestamp: Date.now()
    });

    const session = await DB.get('chat_sessions', sessionId);
    if (session) {
      session.updatedAt = Date.now();
      await DB.set('chat_sessions', session);
    }
  },

  async renderSessionList(category) {
    const listEl = document.getElementById(category === 'psychology' ? 'psychology-chat-list' : 'saju-chat-list');
    if (!listEl) return;

    const allSessions = await DB.getAll('chat_sessions');
    const filtered = allSessions
      .filter(s => s.category === category)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty-list-notice">기록된 대화가 없습니다.</div>';
      return;
    }

    listEl.innerHTML = '';
    const isDeleting = this.deleteMode[category];

    filtered.forEach(session => {
      const item = document.createElement('div');
      const isSelected = this.selectedForDeletion[category].has(session.id);
      item.className = `chat-session-item ${session.id === ChatManager.currentSessionId ? 'active' : ''} ${isSelected ? 'delete-selected' : ''}`;
      
      item.innerHTML = `
        <div class="session-info">
          <span class="session-title">${session.title}</span>
        </div>
        <div class="session-actions">
          <button type="button" class="session-action-btn btn-edit-title" title="제목 수정">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
          </button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-edit-title')) return;

        if (this.deleteMode[category]) {
          if (this.selectedForDeletion[category].has(session.id)) {
            this.selectedForDeletion[category].delete(session.id);
            item.classList.remove('delete-selected');
          } else {
            this.selectedForDeletion[category].add(session.id);
            item.classList.add('delete-selected');
          }
        } else {
          DrawerController.closeLeft(false);
          this.loadSession(session.id);
        }
      });

      const btnEdit = item.querySelector('.btn-edit-title');
      if (btnEdit) {
        btnEdit.addEventListener('click', async (e) => {
          e.stopPropagation();
          const newTitle = prompt('대화방 제목을 입력하세요:', session.title);
          if (newTitle && newTitle.trim()) {
            session.title = newTitle.trim();
            session.isCustomTitle = true;
            session.updatedAt = Date.now();
            await DB.set('chat_sessions', session);
            await this.renderSessionList(category);
          }
        });
      }

      listEl.appendChild(item);
    });
  }
};

// 11. 대화 세션 및 메시지 송수신 매니저 (ChatManager)
const ChatManager = {
  currentSessionId: null,
  activeHistory: [],
  isGenerating: false,

  // 메시지 전송 프로세스
  async sendMessage(category) {
    if (this.isGenerating) return;

    const isPsychology = category === 'psychology';
    const inputEl = document.getElementById(isPsychology ? 'psychology-input' : 'saju-input');
    const sendBtn = document.getElementById(isPsychology ? 'btn-send-psychology' : 'btn-send-saju');
    const containerId = isPsychology ? 'psychology-chat-messages' : 'saju-chat-messages';

    const text = inputEl.value.trim();
    const attachedProfiles = isPsychology ? [] : [...SajuManager.attachedProfiles];

    // 입력값 유효성 검사 (명리학의 경우 이미지만 첨부하고 질문하는 것도 허용)
    if (!text && attachedProfiles.length === 0) return;

    // 1. 전송 UI 상태 잠금
    this.isGenerating = true;
    sendBtn.disabled = true;
    inputEl.value = '';
    inputEl.style.height = 'auto';

    // 활성 세션이 없으면 자동 생성
    if (!this.currentSessionId) {
      const newSession = await SessionManager.createNewSession(category);
      this.currentSessionId = newSession.id;
    }

    // 2. 사용자 말풍선 표시 및 DB 영구 저장
    let displayUserText = text;
    if (!isPsychology && attachedProfiles.length > 0) {
      const tagPrefix = attachedProfiles.map(p => `[${p.name}의 만세력]`).join(' ');
      displayUserText = `${tagPrefix}\n${text}`.trim();
    }
    const userMsgId = `msg_${Date.now()}_u_${Math.random().toString(36).substr(2, 6)}`;
    ChatUI.appendMessage(containerId, 'user', displayUserText, userMsgId);
    this.activeHistory.push({ id: userMsgId, role: 'user', content: displayUserText });
    await DB.set('chat_messages', {
      id: userMsgId,
      sessionId: this.currentSessionId,
      role: 'user',
      content: displayUserText,
      timestamp: Date.now()
    });

    // [핵심] 첫 질문일 때: 사용자가 제목을 수정한 적 없다면 첫 질문을 바탕으로 세션 제목 자동 업데이트 (AI Studio 스타일)
    const currentSession = await DB.get('chat_sessions', this.currentSessionId);
    if (currentSession && !currentSession.isCustomTitle && this.activeHistory.length <= 1) {
      const autoTitle = text.slice(0, 18).trim() + (text.length > 18 ? '...' : '');
      if (autoTitle) {
        currentSession.title = autoTitle;
        await DB.set('chat_sessions', currentSession);
        await SessionManager.renderSessionList(category);
      }
    }

    // 3. 첨부 태그 컨테이너 초기화 (전송 완료 후 비우기)
    if (!isPsychology) {
      SajuManager.attachedProfiles = [];
      SajuManager.renderAttachedTags();
    }

    // 4. AI 답변 말풍선 미리 생성 (고유 ID 즉시 발급)
    const modelMsgId = `msg_${Date.now()}_m_${Math.random().toString(36).substr(2, 6)}`;
    const modelBubble = ChatUI.appendMessage(containerId, 'model', '생각하는 중...', modelMsgId);
    let hasScrolledToTop = false;

    // 5. AI 통신 호출
    await AIEngine.sendRequest({
      category: category,
      userText: text || '만세력을 바탕으로 사주를 분석해 주세요.',
      history: this.activeHistory,
      attachedProfiles: attachedProfiles,

      // 스트리밍 청크 수신 시
      onChunk: (accumulatedText) => {
        // [요구사항] AI 응답이 생성되기 시작하면 말풍선을 화면 최상단으로 주욱 올리는 애니메이션 1회 실행
        if (!hasScrolledToTop) {
          ChatUI.scrollToMessageTop(modelBubble);
          hasScrolledToTop = true;
        }

        // [핵심] modelBubble의 내부 메서드를 통해 안전하게 업데이트하여 contentDiv를 손상시키지 않음
        if (modelBubble && modelBubble.updateRawContent) {
          modelBubble.updateRawContent(accumulatedText);
        }
      },

      // 통신 완료 시 (일시 출력 & 스트리밍 완료 공통)
      onComplete: async (finalText) => {
        // 일시 출력 모드일 때 스크롤 애니메이션 실행
        if (!hasScrolledToTop) {
          ChatUI.scrollToMessageTop(modelBubble);
        }

        if (modelBubble && modelBubble.updateRawContent) {
          modelBubble.updateRawContent(finalText);
        }

        // 메모리 히스토리 업데이트 및 DB 영구 저장
        this.activeHistory.push({ id: modelMsgId, role: 'model', content: finalText });

        await DB.set('chat_messages', {
          id: modelMsgId,
          sessionId: this.currentSessionId,
          role: 'model',
          content: finalText,
          timestamp: Date.now()
        });

        // 세션 갱신일 업데이트 및 목록 새로고침
        const sess = await DB.get('chat_sessions', this.currentSessionId);
        if (sess) {
          sess.updatedAt = Date.now();
          await DB.set('chat_sessions', sess);
        }
        await SessionManager.renderSessionList(category);

        // 보고서 생성 시 심리학 하단 입력창 노출
        if (isPsychology) {
          const reportCheck = MarkdownParser.extractReport(finalText);
          const psychInputBar = document.getElementById('psychology-input-bar');
          if (reportCheck.hasReport && psychInputBar) {
            psychInputBar.classList.remove('hidden');
          }
        }

        // 잠금 해제
        this.isGenerating = false;
        sendBtn.disabled = false;
      },

      // 오류 발생 시
      onError: (errMsg) => {
        if (modelBubble && modelBubble.updateRawContent) {
          modelBubble.updateRawContent(`⚠️ ${errMsg}`);
        } else {
          modelBubble.innerHTML = `<span style="color: #9C413D;">⚠️ ${errMsg}</span>`;
        }
        this.isGenerating = false;
        sendBtn.disabled = false;
      }
    });
  },

  // [핵심] 선택지 및 온보딩 전용 무음 페이로드 전송 (내 쪽 말풍선 없이 즉시 AI 전송)
  async sendChoicePayload(category, payloadText) {
    if (this.isGenerating) return;

    const isPsychology = category === 'psychology';
    const containerId = isPsychology ? 'psychology-chat-messages' : 'saju-chat-messages';

    // 활성 세션이 없으면 자동 생성
    if (!this.currentSessionId) {
      const newSession = await SessionManager.createNewSession(category);
      this.currentSessionId = newSession.id;
    }

    this.isGenerating = true;

    // 히스토리 및 DB에만 영구 보관 (UI 사용자 말풍선은 생성하지 않음!)
    const userMsgId = `msg_${Date.now()}_u_${Math.random().toString(36).substr(2, 6)}`;
    this.activeHistory.push({ id: userMsgId, role: 'user', content: payloadText, silent: true });
    await DB.set('chat_messages', {
      id: userMsgId,
      sessionId: this.currentSessionId,
      role: 'user',
      content: payloadText,
      silent: true,
      timestamp: Date.now()
    });

    // AI 답변 말풍선 미리 생성
    const modelMsgId = `msg_${Date.now()}_m_${Math.random().toString(36).substr(2, 6)}`;
    const modelBubble = ChatUI.appendMessage(containerId, 'model', '생각하는 중...', modelMsgId);
    let hasScrolledToTop = false;

    await AIEngine.sendRequest({
      category: category,
      userText: payloadText,
      history: this.activeHistory,
      attachedProfiles: [],
      onChunk: (accumulatedText) => {
        if (!hasScrolledToTop) {
          ChatUI.scrollToMessageTop(modelBubble);
          hasScrolledToTop = true;
        }
        if (modelBubble && modelBubble.updateRawContent) {
          modelBubble.updateRawContent(accumulatedText);
        }
      },
      onComplete: async (finalText) => {
        if (!hasScrolledToTop) {
          ChatUI.scrollToMessageTop(modelBubble);
        }
        if (modelBubble && modelBubble.updateRawContent) {
          modelBubble.updateRawContent(finalText);
        }

        this.activeHistory.push({ id: modelMsgId, role: 'model', content: finalText });
        await DB.set('chat_messages', {
          id: modelMsgId,
          sessionId: this.currentSessionId,
          role: 'model',
          content: finalText,
          timestamp: Date.now()
        });

        const sess = await DB.get('chat_sessions', this.currentSessionId);
        if (sess) {
          sess.updatedAt = Date.now();
          await DB.set('chat_sessions', sess);
        }
        await SessionManager.renderSessionList(category);

        // 보고서 생성 시 하단 입력창 노출
        if (isPsychology) {
          const reportCheck = MarkdownParser.extractReport(finalText);
          const psychInputBar = document.getElementById('psychology-input-bar');
          if (reportCheck.hasReport && psychInputBar) {
            psychInputBar.classList.remove('hidden');
          }
        }

        this.isGenerating = false;
      },
      onError: (errMsg) => {
        if (modelBubble && modelBubble.updateRawContent) {
          modelBubble.updateRawContent(`⚠️ ${errMsg}`);
        } else {
          modelBubble.innerHTML = `<span style="color: #9C413D;">⚠️ ${errMsg}</span>`;
        }
        this.isGenerating = false;
      }
    });
  }
};

// 6. 대화 UI 헬퍼 및 자동 스크롤 (ChatUI)
const ChatUI = {
  // 메시지 행 추가 (말풍선 + 외곽 하단 수정/삭제 버튼, 사용자/AI 공통 적용)
  appendMessage(containerId, role, rawContent, msgId = null, isGreeting = false) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const row = document.createElement('div');
    row.className = `chat-message-row ${role}`;

    const currentMsgId = msgId || `msg_${Date.now()}_${role[0]}_${Math.random().toString(36).substr(2, 6)}`;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.dataset.msgId = currentMsgId;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'bubble-text-content';

    let currentRaw = rawContent || '';

    const renderInnerContent = () => {
      if (role === 'model') {
        // [신규] 심리학 온보딩 첫 질문인 경우 전용 카드 렌더링
        if (currentRaw.includes('__PSYCHOLOGY_ONBOARDING__') || (isGreeting && containerId === 'psychology-chat-messages')) {
          contentDiv.innerHTML = MarkdownParser.renderPsychologyOnboarding(currentMsgId);
          MarkdownParser.bindOnboardingEvents(contentDiv, currentMsgId);
          return;
        }

        const extracted = MarkdownParser.extractReport(currentRaw);
        if (extracted.hasReport) {
          // 사용자 명확한 요구사항: 보고서 생성 시 대화창에는 본문 없이 오직 열기 버튼만 노출
          contentDiv.innerHTML = '';
          const reportCard = document.createElement('div');
          reportCard.className = 'report-card-summary';
          reportCard.innerHTML = `
            <div class="report-card-info">
              <span class="report-card-title">심층 분석 보고서</span>
              <span class="report-card-desc">전문 분석 보고서 생성이 완료되었습니다.</span>
            </div>
            <button type="button" class="btn-open-report">열기</button>
          `;
          reportCard.querySelector('.btn-open-report').addEventListener('click', () => {
            ReportController.open(extracted.reportContent);
          });
          contentDiv.appendChild(reportCard);

          // 보고서 생성 시 심리학 하단 입력창 노출
          const psychInputBar = document.getElementById('psychology-input-bar');
          if (psychInputBar) {
            psychInputBar.classList.remove('hidden');
          }
        } else {
          // 심리학 대화방 모델 응답인 경우 대화형 선택지 도시에 파싱 적용
          if (containerId === 'psychology-chat-messages') {
            const dossier = MarkdownParser.parseChoiceDossier(currentRaw, currentMsgId);
            if (dossier.hasChoices) {
              contentDiv.innerHTML = dossier.html;
              MarkdownParser.bindChoiceEvents(contentDiv, currentMsgId);
            } else {
              contentDiv.innerHTML = MarkdownParser.parse(currentRaw);
            }
          } else {
            contentDiv.innerHTML = MarkdownParser.parse(currentRaw);
          }
        }
      } else {
        contentDiv.innerHTML = MarkdownParser.parse(currentRaw);
      }
    };

    renderInnerContent();
    bubble.appendChild(contentDiv);

    // [핵심] 외부에서 안전하게 내용 업데이트 가능한 메서드 제공 (스트리밍 및 완료 시 사용)
    bubble.updateRawContent = (newText) => {
      currentRaw = newText;
      bubble.dataset.rawContent = newText;
      renderInnerContent();
    };

    bubble.getRawContent = () => currentRaw;

    row.appendChild(bubble);

    // [요구사항] 시스템 첫 인사가 아니면 말풍선 아예 끝난 바깥 하단에 액션 버튼 배치 (사용자/AI 공통 적용)
    if (!isGreeting) {
      const actionBar = document.createElement('div');
      actionBar.className = 'bubble-action-bar-outside';
      actionBar.innerHTML = `
        <button type="button" class="bubble-action-btn btn-edit-msg" title="메시지 수정">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-line"><path d="M13 21h8"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
        </button>
        <button type="button" class="bubble-action-btn btn-delete-msg" title="메시지 삭제">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eraser"><path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21"/><path d="m5.082 11.09 8.828 8.828"/></svg>
        </button>
      `;

      // 수정 클릭 시: 본문 완전 숨김 + AI 완성본 본문이 온전히 들어간 텍스트에리어 활성화
      actionBar.querySelector('.btn-edit-msg').addEventListener('click', () => {
        // 기존 본문 완벽하게 숨김
        contentDiv.classList.add('hidden');
        contentDiv.style.display = 'none';
        actionBar.classList.add('hidden');

        // 카드 그대로 두고, 최소 폭을 확보해 편안하게 입력
        bubble.classList.add('is-editing');
        bubble.style.minWidth = 'min(100%, 280px)';

        // 중복 방지
        const existingEdit = bubble.querySelector('.bubble-edit-textarea');
        if (existingEdit) existingEdit.remove();
        const existingOutside = row.querySelector('.bubble-action-bar-outside.is-editing-bar');
        if (existingOutside) existingOutside.remove();

        const editArea = document.createElement('textarea');
        editArea.className = 'bubble-edit-textarea';
        // AI 본문 전체를 100% 온전하게 주입
        editArea.value = currentRaw;
        bubble.appendChild(editArea);

        // 텍스트 에리어 크기만큼 자동으로 크기 조절
        const autoResize = () => {
          editArea.style.height = 'auto';
          editArea.style.height = `${Math.max(editArea.scrollHeight, 60)}px`;
        };
        autoResize();
        editArea.addEventListener('input', autoResize);
        editArea.focus();
        editArea.setSelectionRange(editArea.value.length, editArea.value.length);

        // [취소] [확인] 버튼 바는 말풍선 바깥 아래쪽 우측에 배치
        const outsideEditBar = document.createElement('div');
        outsideEditBar.className = 'bubble-action-bar-outside is-editing-bar';
        outsideEditBar.style.cssText = 'display:flex; justify-content:flex-end; gap:12px; margin-top:6px;';
        outsideEditBar.innerHTML = `
          <button type="button" class="btn-bubble-cancel" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.8rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            <span>취소</span>
          </button>
          <button type="button" class="btn-bubble-confirm" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.8rem; font-weight:600;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
            <span>확인</span>
          </button>
        `;

        // 취소 클릭
        outsideEditBar.querySelector('.btn-bubble-cancel').addEventListener('click', () => {
          editArea.remove();
          outsideEditBar.remove();
          bubble.classList.remove('is-editing');
          bubble.style.minWidth = '';
          contentDiv.classList.remove('hidden');
          contentDiv.style.display = '';
          actionBar.classList.remove('hidden');
        });

        // 확인 클릭: DB 저장 및 다음 Payload 완벽 동기화
        outsideEditBar.querySelector('.btn-bubble-confirm').addEventListener('click', async () => {
          const updatedText = editArea.value.trim();
          if (!updatedText) return;

          const oldText = currentRaw;
          currentRaw = updatedText;
          bubble.dataset.rawContent = updatedText;
          renderInnerContent();

          const targetId = bubble.dataset.msgId || currentMsgId;
          if (targetId) {
            const msgObj = await DB.get('chat_messages', targetId);
            if (msgObj) {
              msgObj.content = updatedText;
              await DB.set('chat_messages', msgObj);
            }
          }

          // activeHistory 동기화
          const histItem = ChatManager.activeHistory.find(h => (h.id && h.id === targetId) || (h.role === role && h.content === oldText));
          if (histItem) {
            histItem.content = updatedText;
          }

          editArea.remove();
          outsideEditBar.remove();
          bubble.classList.remove('is-editing');
          bubble.style.minWidth = '';
          contentDiv.classList.remove('hidden');
          contentDiv.style.display = '';
          actionBar.classList.remove('hidden');
        });

        row.appendChild(outsideEditBar);
      });

      // 삭제 클릭
      actionBar.querySelector('.btn-delete-msg').addEventListener('click', async () => {
        if (confirm('이 메시지를 삭제하시겠습니까?')) {
          const targetId = bubble.dataset.msgId || currentMsgId;
          if (targetId) {
            await DB.delete('chat_messages', targetId);
          }
          // activeHistory에서 완벽 필터링 제거
          ChatManager.activeHistory = ChatManager.activeHistory.filter(h => {
            if (h.id && targetId) return h.id !== targetId;
            return !(h.role === role && h.content === currentRaw);
          });
          row.remove();
        }
      });

      row.appendChild(actionBar);
    }

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    return bubble;
  },
  
  // [요구사항] AI의 답변 도착 완료 시 답변 말풍선을 화면 최상단으로 주욱 올리는 부드러운 스크롤 애니메이션
  scrollToMessageTop(bubbleEl) {
    if (!bubbleEl) return;
    const container = bubbleEl.closest('.chat-messages-container');
    if (!container) return;

    // 해당 말풍선의 container 기준 상대 offset 계산
    const bubbleTop = bubbleEl.offsetTop - 12; // 상단 여백 12px 확보
    container.scrollTo({
      top: bubbleTop,
      behavior: 'smooth'
    });
  }
};

// 4. 모달 관리자 & 닫힘 시 일괄 저장 (ModalController)
const ModalController = {
  container: document.getElementById('modal-container'),
  activeModalId: null,

  async open(modalId) {
    if (this.activeModalId) return;

    // 열기 전 DB에서 최신 데이터 로드하여 폼 채우기
    await this.loadFormData(modalId);

    this.activeModalId = modalId;
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;

    this.container.classList.remove('hidden');
    modalEl.classList.remove('hidden');

    // 암전 활성화 (서랍이 열려있지 않은 경우 암전 활성화)
    DrawerController.backdrop.classList.remove('hidden');
    void DrawerController.backdrop.offsetWidth;
    DrawerController.backdrop.classList.add('active');

    // 뒤로가기 스택에 모달 닫기 등록
    NavStack.push({
      id: modalId,
      onClose: () => this.close(false)
    });
  },

  async close(triggerBack = true) {
    if (!this.activeModalId) return;

    const modalId = this.activeModalId;
    const modalEl = document.getElementById(modalId);

    // [핵심] 모달이 닫히는 바로 이 순간 IndexedDB에 일괄 저장 수행
    await this.saveFormData(modalId);

    if (modalEl) modalEl.classList.add('hidden');
    this.container.classList.add('hidden');
    this.activeModalId = null;

    // 만약 서랍이 열려있지 않다면 암전도 함께 닫기
    if (!DrawerController.isOpenLeft) {
      DrawerController.backdrop.classList.remove('active');
      setTimeout(() => {
        if (!DrawerController.isOpenLeft && !this.activeModalId) {
          DrawerController.backdrop.classList.add('hidden');
        }
      }, 280);
    }

    if (triggerBack) {
      NavStack.pop();
    }
  },

  // 폼 데이터 IndexedDB로부터 로드
  async loadFormData(modalId) {
    try {
      if (modalId === 'modal-prompts') {
        const psychPrompt = await DB.get('prompts', 'psychology');
        const sajuPrompt = await DB.get('prompts', 'saju');
        document.getElementById('prompt-psychology-input').value = psychPrompt?.content || '';
        document.getElementById('prompt-saju-input').value = sajuPrompt?.content || '';
      } else if (modalId === 'modal-settings') {
        const geminiKey = await DB.get('settings', 'gemini_api_key');
        const vertexConfig = await DB.get('settings', 'vertex_config');
        const recaptchaKey = await DB.get('settings', 'recaptcha_site_key');
        const recaptchaType = await DB.get('settings', 'recaptcha_type');
        const firestoreConfig = await DB.get('settings', 'firestore_config');
        const general = await DB.get('settings', 'general_settings');

        document.getElementById('setting-gemini-key').value = geminiKey?.value || '';
        document.getElementById('setting-vertex-config').value = vertexConfig?.value || '';
        const recaptchaInput = document.getElementById('setting-recaptcha-sitekey');
        if (recaptchaInput) recaptchaInput.value = recaptchaKey?.value || '';
        if (recaptchaType?.value === 'v3') {
          const v3Radio = document.getElementById('recaptcha-type-v3');
          if (v3Radio) v3Radio.checked = true;
        } else {
          const entRadio = document.getElementById('recaptcha-type-enterprise');
          if (entRadio) entRadio.checked = true;
        }
        document.getElementById('setting-firestore-config').value = firestoreConfig?.value || '';

        // 드롭다운 모드 복원
        const outputMode = general?.outputMode || 'stream';
        const labelText = outputMode === 'batch' ? '일시 출력 (답변 완성 후 한번에 표시)' : '스트리밍 출력 (실시간 생성)';
        document.getElementById('dropdown-selected-text').textContent = labelText;
        document.querySelectorAll('#dropdown-output-menu .dropdown-item').forEach(item => {
          item.classList.toggle('selected', item.dataset.value === outputMode);
        });

        // 모델 및 안전필터 복원
        if (general?.model) document.getElementById('select-gemini-model').value = general.model;
        if (general?.safety) {
          if (general.safety.harassment) document.getElementById('safety-harassment').value = general.safety.harassment;
          if (general.safety.hate) document.getElementById('safety-hate').value = general.safety.hate;
          if (general.safety.sex) document.getElementById('safety-sex').value = general.safety.sex;
          if (general.safety.danger) document.getElementById('safety-danger').value = general.safety.danger;
        }

        // 생각 깊이 복원
        const reasoningSelect = document.getElementById('ep-lore-reasoning-select');
        const reasoningBudgetInput = document.getElementById('ep-lore-reasoning-budget-input');
        const budgetWrapper = document.getElementById('reasoning-budget-wrapper');
        if (reasoningSelect) {
          reasoningSelect.value = general?.reasoning || 'medium';
          if (budgetWrapper) {
            budgetWrapper.classList.toggle('hidden', reasoningSelect.value !== 'budget');
          }
        }
        if (reasoningBudgetInput) {
          reasoningBudgetInput.value = general?.reasoningBudget || 2048;
        }
      }
    } catch (e) {
      console.error('데이터 로드 실패:', e);
    }
  },

  // 폼 데이터 IndexedDB로 최종 일괄 저장 (실시간 타자 중 저장 방지)
  async saveFormData(modalId) {
    try {
      if (modalId === 'modal-prompts') {
        const psychVal = document.getElementById('prompt-psychology-input').value;
        const sajuVal = document.getElementById('prompt-saju-input').value;
        await DB.set('prompts', { id: 'psychology', content: psychVal, updatedAt: Date.now() });
        await DB.set('prompts', { id: 'saju', content: sajuVal, updatedAt: Date.now() });
      } else if (modalId === 'modal-settings') {
        const geminiVal = document.getElementById('setting-gemini-key').value;
        const vertexVal = document.getElementById('setting-vertex-config').value;
        const recaptchaSiteKey = document.getElementById('setting-recaptcha-sitekey')?.value?.trim() || '';
        const recaptchaType = document.querySelector('input[name="recaptcha-type"]:checked')?.value || 'enterprise';
        const firestoreVal = document.getElementById('setting-firestore-config').value;
        const selectedItem = document.querySelector('#dropdown-output-menu .dropdown-item.selected');
        const outputMode = selectedItem ? selectedItem.dataset.value : 'stream';

        await DB.set('settings', { id: 'gemini_api_key', value: geminiVal, updatedAt: Date.now() });
        await DB.set('settings', { id: 'vertex_config', value: vertexVal, updatedAt: Date.now() });
        await DB.set('settings', { id: 'recaptcha_site_key', value: recaptchaSiteKey, updatedAt: Date.now() });
        await DB.set('settings', { id: 'recaptcha_type', value: recaptchaType, updatedAt: Date.now() });
        await DB.set('settings', { id: 'firestore_config', value: firestoreVal, updatedAt: Date.now() });
        const selectedModel = document.getElementById('select-gemini-model').value;
        const safetySettings = {
          harassment: document.getElementById('safety-harassment').value,
          hate: document.getElementById('safety-hate').value,
          sex: document.getElementById('safety-sex').value,
          danger: document.getElementById('safety-danger').value
        };

        const reasoningSelect = document.getElementById('ep-lore-reasoning-select');
        const reasoningBudgetInput = document.getElementById('ep-lore-reasoning-budget-input');
        const reasoningVal = reasoningSelect ? reasoningSelect.value : 'medium';
        const reasoningBudget = reasoningBudgetInput ? parseInt(reasoningBudgetInput.value, 10) : 2048;

        await DB.set('settings', {
          id: 'general_settings',
          outputMode: outputMode,
          model: selectedModel,
          safety: safetySettings,
          reasoning: reasoningVal,
          reasoningBudget: isNaN(reasoningBudget) ? 2048 : reasoningBudget,
          updatedAt: Date.now()
        });
      } else if (modalId === 'modal-add-saju') {
        // [요구사항] 명식 추가 창이 닫힐 때 이름과 이미지가 있으면 자동 저장!
        const nameInput = document.getElementById('saju-profile-name');
        const name = nameInput ? nameInput.value.trim() : '';
        if (name && SajuManager.tempImageData) {
          await SajuManager.saveNewProfile(name, SajuManager.tempImageData);
          nameInput.value = '';
          const previewContainer = document.getElementById('saju-image-preview');
          if (previewContainer) previewContainer.classList.add('hidden');
          const placeholder = document.getElementById('saju-upload-placeholder');
          if (placeholder) placeholder.classList.remove('hidden');
          SajuManager.tempImageData = null;
        }
      }
    } catch (e) {
      console.error('데이터 저장 실패:', e);
    }
  }
};

// 3. 서랍 및 오버레이 UI 컨트롤러 (DrawerController)
const DrawerController = {
  leftDrawer: document.getElementById('left-drawer'),
  rightDrawer: document.getElementById('right-saju-drawer'),
  btnToggleSaju: document.getElementById('btn-toggle-saju-drawer'),
  backdrop: document.getElementById('backdrop-overlay'),
  isOpenLeft: false,
  isOpenRight: false,

  openRight() {
    if (this.isOpenRight) return;
    this.isOpenRight = true;
    this.rightDrawer.classList.add('open');
    this.btnToggleSaju.classList.add('open');
    this.rightDrawer.setAttribute('aria-hidden', 'false');

    // 헤더 2 아래부터 암전 적용 클래스 추가
    this.backdrop.classList.add('saju-mode-dim');
    this.backdrop.classList.remove('hidden');
    void this.backdrop.offsetWidth;
    this.backdrop.classList.add('active');

    // 우측 서랍 열릴 때 최신 명식 목록 자동 로드
    SajuManager.renderProfilesList();

    NavStack.push({
      id: 'right-saju-drawer',
      onClose: () => this.closeRight(false)
    });
  },

  closeRight(triggerBack = true) {
    if (!this.isOpenRight) return;
    this.isOpenRight = false;
    this.rightDrawer.classList.remove('open');
    this.btnToggleSaju.classList.remove('open');
    this.rightDrawer.setAttribute('aria-hidden', 'true');
    this.backdrop.classList.remove('active');

    setTimeout(() => {
      if (!this.isOpenRight && !this.isOpenLeft) {
        this.backdrop.classList.remove('saju-mode-dim');
        this.backdrop.classList.add('hidden');
      }
    }, 280);

    if (triggerBack) {
      NavStack.pop();
    }
  },

  openLeft() {
    if (this.isOpenLeft) return;
    this.isOpenLeft = true;

    // 좌측 서랍 열릴 때 대화 기록 리스트 최신 상태로 갱신
    SessionManager.renderSessionList('psychology');
    SessionManager.renderSessionList('saju');
    this.leftDrawer.classList.add('open');
    this.leftDrawer.setAttribute('aria-hidden', 'false');
    this.backdrop.classList.remove('hidden');
    void this.backdrop.offsetWidth;
    this.backdrop.classList.add('active');

    // 뒤로가기 스택에 서랍 닫기 등록
    NavStack.push({
      id: 'left-drawer',
      onClose: () => this.closeLeft(false)
    });
  },

  closeLeft(triggerBack = true) {
    if (!this.isOpenLeft) return;
    this.isOpenLeft = false;
    this.leftDrawer.classList.remove('open');
    this.leftDrawer.setAttribute('aria-hidden', 'true');
    this.backdrop.classList.remove('active');

    setTimeout(() => {
      if (!this.isOpenLeft) {
        this.backdrop.classList.add('hidden');
      }
    }, 280);

    if (triggerBack) {
      NavStack.pop();
    }
  }
};

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  // IndexedDB 초기화
  try {
    await DB.init();
  } catch (err) {
    console.error('IndexedDB 로드 오류:', err);
  }

  NavStack.init();
  KeyboardViewportManager.init(); // 가상 키보드 자석 고정 초기화

  // [요구사항 2] 모바일 새로고침 유지: 기존 화면 및 세션 그대로 복구
  let restored = false;
  try {
    const savedView = typeof localStorage !== 'undefined' ? localStorage.getItem('about_me_active_view') : null;
    const savedSessionId = typeof localStorage !== 'undefined' ? localStorage.getItem('about_me_active_session_id') : null;

    if (savedView && (savedView === 'psychology' || savedView === 'saju')) {
      if (savedSessionId) {
        const session = await DB.get('chat_sessions', savedSessionId);
        if (session) {
          await SessionManager.loadSession(savedSessionId);
          restored = true;
        }
      }
      if (!restored) {
        // 해당 카테고리의 가장 최근 세션 복구
        const allSessions = await DB.getAll('chat_sessions');
        const catSessions = allSessions.filter(s => s.category === savedView).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        if (catSessions.length > 0) {
          await SessionManager.loadSession(catSessions[0].id);
          restored = true;
        }
      }
      if (!restored) {
        Router.navigate(savedView, false);
        restored = true;
      }
    }
  } catch (err) {
    console.warn('화면 상태 복구 중 오류:', err);
  }

  if (!restored) {
    Router.navigate('landing', false);
  }

  // 전송 버튼 클릭 바인딩 (엔터키는 전송하지 않고 순수 줄바꿈으로 유지)
  const psychInput = document.getElementById('psychology-input');
  const sajuInput = document.getElementById('saju-input');
  const btnSendPsych = document.getElementById('btn-send-psychology');
  const btnSendSaju = document.getElementById('btn-send-saju');

  if (psychInput && btnSendPsych) {
    btnSendPsych.addEventListener('click', () => ChatManager.sendMessage('psychology'));
  }

  if (sajuInput && btnSendSaju) {
    btnSendSaju.addEventListener('click', () => ChatManager.sendMessage('saju'));
  }

  document.querySelectorAll('.chat-textarea').forEach(textarea => {
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  });

  // 랜딩 화면 버튼 이벤트 바인딩
  const btnPsychology = document.getElementById('btn-start-psychology');
  const btnSaju = document.getElementById('btn-start-saju');

  // 새 대화 시작 함수
  const startFreshChat = async (category) => {
    ChatManager.currentSessionId = null;
    ChatManager.activeHistory = [];
    const containerId = category === 'psychology' ? 'psychology-chat-messages' : 'saju-chat-messages';
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    // 심리학인 경우 하단 입력창을 기본 숨김 (보고서 출력 후 노출)
    if (category === 'psychology') {
      const psychInputBar = document.getElementById('psychology-input-bar');
      if (psychInputBar) psychInputBar.classList.add('hidden');
    }

    const newSession = await SessionManager.createNewSession(category);
    ChatManager.currentSessionId = newSession.id;
    Router.navigate(category);

    // [요구사항] 대화방 화면에 첫 안내 AI 말풍선 자동 출력 (Payload에는 미포함)
    if (INITIAL_GREETINGS[category]) {
      ChatUI.appendMessage(containerId, 'model', INITIAL_GREETINGS[category], null, true);
    }
  };

  if (btnPsychology) {
    btnPsychology.addEventListener('click', () => startFreshChat('psychology'));
  }

  if (btnSaju) {
    btnSaju.addEventListener('click', () => startFreshChat('saju'));
  }

  // 좌측 서랍 세션 헤더 '선택 삭제' 휴지통 버튼
  const btnDeleteModePsych = document.getElementById('btn-delete-mode-psych');
  const btnDeleteModeSaju = document.getElementById('btn-delete-mode-saju');

  if (btnDeleteModePsych) {
    btnDeleteModePsych.addEventListener('click', () => SessionManager.toggleDeleteMode('psychology'));
  }
  if (btnDeleteModeSaju) {
    btnDeleteModeSaju.addEventListener('click', () => SessionManager.toggleDeleteMode('saju'));
  }

  // 좌측 서랍 열기/닫기 토글 버튼 (헤더 1 햄버거 버튼)
  const btnOpenLeftDrawer = document.getElementById('btn-open-left-drawer');
  if (btnOpenLeftDrawer) {
    btnOpenLeftDrawer.addEventListener('click', () => {
      if (DrawerController.isOpenLeft) {
        DrawerController.closeLeft(false);
      } else {
        DrawerController.openLeft();
      }
    });
  }

  // 암전 오버레이 터치 시: 대화방을 이탈하지 않고 오직 열린 서랍/모달만 닫기
  const backdrop = document.getElementById('backdrop-overlay');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      if (ModalController.activeModalId) {
        ModalController.close(false); // 라우터 이탈 없이 모달만 안전하게 닫기
      } else if (DrawerController.isOpenRight) {
        DrawerController.closeRight(false); // 서랍만 닫기
      } else if (DrawerController.isOpenLeft) {
        DrawerController.closeLeft(false); // 서랍만 닫기
      }
    });
  }

  // 헤더 1 로고 터치 시 어디서든 홈(랜딩 화면)으로 복귀
  const headerLogo = document.getElementById('header-title');
  if (headerLogo) {
    headerLogo.addEventListener('click', () => {
      // 열린 서랍이나 모달이 있다면 닫고
      if (DrawerController.isOpenLeft) DrawerController.closeLeft(false);
      if (DrawerController.isOpenRight) DrawerController.closeRight(false);
      if (ModalController.activeModalId) ModalController.close(false);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('about_me_active_view', 'landing');
          localStorage.removeItem('about_me_active_session_id');
        }
      } catch (e) {}
      Router.navigate('landing');
    });
  }

  // 헤더 1 우측 손가락 아이콘 토글 (닫을 때 라우터 튕김 없이 서랍만 쏙 닫히도록 false 전달)
  const btnToggleSaju = document.getElementById('btn-toggle-saju-drawer');
  if (btnToggleSaju) {
    btnToggleSaju.addEventListener('click', () => {
      if (DrawerController.isOpenRight) {
        DrawerController.closeRight(false); // [핵심] 첫 화면으로 튕김 원천 차단
      } else {
        DrawerController.openRight();
      }
    });
  }

  // 명식 서랍 내 '+' 추가 버튼 클릭 시 모달 열기
  const btnOpenAddSaju = document.getElementById('btn-open-add-saju');
  if (btnOpenAddSaju) {
    btnOpenAddSaju.addEventListener('click', () => {
      if (SajuManager.isDeleteMode) SajuManager.toggleDeleteMode();
      DrawerController.closeRight(false);
      ModalController.open('modal-add-saju');
    });
  }

  // 명식 서랍 내 '선택 삭제' 토글 버튼
  const btnToggleDeleteSaju = document.getElementById('btn-toggle-delete-saju');
  if (btnToggleDeleteSaju) {
    btnToggleDeleteSaju.addEventListener('click', () => {
      SajuManager.toggleDeleteMode();
    });
  }
  
  // 이미지 파일 선택 처리
  const fileInput = document.getElementById('saju-image-file');
  const btnSelectImage = document.getElementById('btn-select-saju-image');
  const dropzone = document.getElementById('saju-file-dropzone');
  const previewContainer = document.getElementById('saju-image-preview');
  const previewImg = document.getElementById('saju-preview-img');
  const previewFileName = document.getElementById('saju-file-name');
  const uploadPlaceholder = document.getElementById('saju-upload-placeholder');

  if (fileInput) {
    if (btnSelectImage) {
      btnSelectImage.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }
    if (dropzone) {
      dropzone.addEventListener('click', () => fileInput.click());
    }

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        // 스마트 압축 적용 (10MB 폰 사진 -> 200KB 고선명 만세력 이미지로 최적화)
        const optimizedBase64 = await SajuManager.compressImage(file);
        SajuManager.tempImageData = optimizedBase64;
        previewImg.src = optimizedBase64;
        previewFileName.textContent = file.name;
        previewContainer.classList.remove('hidden');
        if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
      } catch (err) {
        console.error('이미지 압축 실패, 원본 사용:', err);
        const reader = new FileReader();
        reader.onload = (event) => {
          SajuManager.tempImageData = event.target.result;
          previewImg.src = event.target.result;
          previewFileName.textContent = file.name;
          previewContainer.classList.remove('hidden');
          if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 명식 등록 저장 버튼 이벤트
  const btnSaveSaju = document.getElementById('btn-save-saju-profile');
  if (btnSaveSaju) {
    btnSaveSaju.addEventListener('click', async () => {
      const nameInput = document.getElementById('saju-profile-name');
      const name = nameInput.value.trim();

      if (!name) {
        alert('이름을 입력해 주세요.');
        return;
      }
      if (!SajuManager.tempImageData) {
        alert('만세력 사진을 선택해 주세요.');
        return;
      }

      await SajuManager.saveNewProfile(name, SajuManager.tempImageData);

      // 입력 필드 초기화
      nameInput.value = '';
      fileInput.value = '';
      previewContainer.classList.add('hidden');
      SajuManager.tempImageData = null;

      // 모달 닫고 우측 서랍 다시 열기
      await ModalController.close(true);
      DrawerController.openRight();
    });
  }

  // 좌측 서랍 하단 툴바 버튼 이벤트 바인딩
  const btnOpenPrompts = document.getElementById('btn-open-prompts-modal');
  if (btnOpenPrompts) {
    btnOpenPrompts.addEventListener('click', () => {
      DrawerController.closeLeft(false); // 서랍 닫고
      ModalController.open('modal-prompts'); // 프롬프트 팝업 열기
    });
  }

  const btnOpenApi = document.getElementById('btn-open-api-modal');
  if (btnOpenApi) {
    btnOpenApi.addEventListener('click', () => {
      DrawerController.closeLeft(false); // 서랍 닫고
      ModalController.open('modal-settings'); // 설정 팝업 열기
    });
  }

  // 클라우드 백업 버튼
  const btnBackup = document.getElementById('btn-cloud-backup');
  if (btnBackup) {
    btnBackup.addEventListener('click', () => {
      DrawerController.closeLeft(true);
      CloudBackupManager.backup();
    });
  }

  // 클라우드 복원 버튼
  const btnRestore = document.getElementById('btn-cloud-restore');
  if (btnRestore) {
    btnRestore.addEventListener('click', () => {
      DrawerController.closeLeft(true);
      CloudBackupManager.restore();
    });
  }

  // 모달 내부 닫기(✕) 버튼 클릭 이벤트
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      ModalController.close(true);
    });
  });

  // 전체화면 보고서 닫기(✕) 버튼 이벤트
  const btnCloseReport = document.getElementById('btn-close-report');
  if (btnCloseReport) {
    btnCloseReport.addEventListener('click', () => {
      ReportController.close(true);
    });
  }

  // 모달 탭 전환 이벤트 바인딩
  document.querySelectorAll('.modal-tabs').forEach(tabGroup => {
    tabGroup.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.tab-btn');
      if (!tabBtn) return;

      const targetTabId = tabBtn.dataset.tab;
      const modalEl = tabBtn.closest('.app-modal');

      // 탭 버튼 active 토글
      modalEl.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');

      // 탭 컨텐츠 전환
      modalEl.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === targetTabId);
        content.classList.toggle('hidden', content.id !== targetTabId);
      });
    });
  });

  // 일반 설정 탭: 커스텀 드롭다운 동작 바인딩
  const dropdownBtn = document.getElementById('dropdown-output-btn');
  const dropdownMenu = document.getElementById('dropdown-output-menu');
  const selectedText = document.getElementById('dropdown-selected-text');

  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
      dropdownBtn.classList.toggle('open');
    });

    dropdownMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item');
      if (!item) return;

      dropdownMenu.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      selectedText.textContent = item.textContent;

      dropdownMenu.classList.add('hidden');
      dropdownBtn.classList.remove('open');
    });

    document.addEventListener('click', () => {
      dropdownMenu.classList.add('hidden');
      dropdownBtn.classList.remove('open');
    });
  }

  // 생각 깊이 (Reasoning) 예산 입력 필드 표시 토글
  const reasoningSelect = document.getElementById('ep-lore-reasoning-select');
  const reasoningBudgetWrapper = document.getElementById('reasoning-budget-wrapper');
  if (reasoningSelect && reasoningBudgetWrapper) {
    reasoningSelect.addEventListener('change', () => {
      reasoningBudgetWrapper.classList.toggle('hidden', reasoningSelect.value !== 'budget');
    });
  }

  // App Check 토큰 발급 실시간 진단 테스트 버튼
  const btnTestAppCheck = document.getElementById('btn-test-appcheck');
  const appCheckResultEl = document.getElementById('appcheck-test-result');
  if (btnTestAppCheck && appCheckResultEl) {
    btnTestAppCheck.addEventListener('click', async () => {
      appCheckResultEl.innerHTML = '<span style="color: var(--text-secondary);">⏳ App Check 토큰 발급 테스트 중...</span>';
      btnTestAppCheck.disabled = true;

      try {
        const vertexConfigVal = document.getElementById('setting-vertex-config')?.value || '';
        const siteKeyVal = document.getElementById('setting-recaptcha-sitekey')?.value || '';
        const typeVal = document.querySelector('input[name="recaptcha-type"]:checked')?.value || 'enterprise';

        const config = VertexManager.parseConfig(vertexConfigVal, siteKeyVal, typeVal);
        if (!config || !config.projectId) {
          throw new Error('상단의 Firebase Config(projectId 및 apiKey)를 먼저 입력해 주세요.');
        }
        if (!config.recaptchaSiteKey) {
          throw new Error('reCAPTCHA 사이트 키(6L...)를 입력해 주세요.');
        }

        await VertexManager.init(config);
        const token = await VertexManager.getAppCheckToken(true);
        if (token) {
          appCheckResultEl.innerHTML = `<span style="color: #4CAF50; font-weight: 600;">✅ App Check 7일 유효 토큰 저장 완료!</span><br><span style="color: var(--text-secondary); word-break: break-all;">(토큰: ${token.substring(0, 16)}... 7일간 재발급 없이 영구 캐시로 계속 인증됩니다)</span>`;
        } else {
          appCheckResultEl.innerHTML = `<span style="color: #E57373;">⚠️ 토큰이 반환되지 않았습니다. 사이트 키와 도메인(${window.location.hostname}) 설정을 확인하세요.</span>`;
        }
      } catch (err) {
        console.error('[App Check 테스트 실패]:', err);
        appCheckResultEl.innerHTML = `<span style="color: #E57373; font-weight: 600;">❌ 발급 실패:</span> <span style="color: var(--text-primary); font-size: 0.78rem;">${err.message}</span>`;
      } finally {
        btnTestAppCheck.disabled = false;
      }
    });
  }
});

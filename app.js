// 難易度定義
const LEVELS = {
  1: { name: '入門', color: '#27ae60' },
  2: { name: '初級', color: '#3498db' },
  3: { name: '中級', color: '#f39c12' },
  4: { name: '中上級', color: '#e67e22' },
  5: { name: '上級', color: '#e74c3c' },
  6: { name: '実践', color: '#9b59b6' }
};

// 問題管理クラス
class ExerciseManager {
  constructor(type, exercises) {
    this.type = type;
    this.exercises = exercises;
    this.filteredExercises = [...exercises];
    this.currentIndex = 0;
    this.completedKey = `${type}-completed`;
    this.completed = JSON.parse(localStorage.getItem(this.completedKey) || '[]');
    this.currentFilter = 'all';
  }

  init() {
    this.renderLevelFilter();
    this.renderExerciseList();
    this.setupEventListeners();
    this.updateProgress();
  }

  renderLevelFilter() {
    const filterContainer = document.getElementById('level-filter');
    if (!filterContainer) return;

    filterContainer.innerHTML = `
      <button class="filter-btn active" data-level="all">すべて</button>
      ${Object.entries(LEVELS).map(([level, info]) => `
        <button class="filter-btn" data-level="${level}" style="--level-color: ${info.color}">
          ${info.name}
        </button>
      `).join('')}
    `;
  }

  renderExerciseList() {
    const listContainer = document.getElementById('exercise-list');
    if (!listContainer) return;

    if (this.filteredExercises.length === 0) {
      listContainer.innerHTML = '<p style="color: #a0a0a0; text-align: center; padding: 2rem;">この難易度の問題はありません</p>';
      return;
    }

    listContainer.innerHTML = this.filteredExercises.map((ex, index) => {
      const originalIndex = this.exercises.indexOf(ex);
      const levelInfo = LEVELS[ex.level];
      return `
        <div class="exercise-item ${this.completed.includes(originalIndex) ? 'completed' : ''}" data-index="${index}">
          <div class="exercise-info">
            <div class="exercise-meta">
              <span class="level-badge" style="background: ${levelInfo.color}">${levelInfo.name}</span>
              <span class="exercise-num">問題 ${originalIndex + 1}</span>
            </div>
            <h3>${ex.title}</h3>
            <p>${ex.description}</p>
          </div>
          <div class="exercise-status">
            ${this.completed.includes(originalIndex) ? '✓' : '▶'}
          </div>
        </div>
      `;
    }).join('');
  }

  setupEventListeners() {
    // 難易度フィルター
    document.getElementById('level-filter')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const level = btn.dataset.level;
      this.currentFilter = level;

      if (level === 'all') {
        this.filteredExercises = [...this.exercises];
      } else {
        this.filteredExercises = this.exercises.filter(ex => ex.level === parseInt(level));
      }

      this.renderExerciseList();
    });

    // 問題リストのクリック
    document.getElementById('exercise-list')?.addEventListener('click', (e) => {
      const item = e.target.closest('.exercise-item');
      if (item) {
        const filteredIndex = parseInt(item.dataset.index);
        const exercise = this.filteredExercises[filteredIndex];
        this.currentIndex = this.exercises.indexOf(exercise);
        this.showExercise();
      }
    });

    // 実行ボタン
    document.getElementById('run-btn')?.addEventListener('click', () => {
      this.runCode();
    });

    // 答え合わせボタン
    document.getElementById('check-btn')?.addEventListener('click', () => {
      this.checkAnswer();
    });

    // 解答を見るボタン
    document.getElementById('show-answer-btn')?.addEventListener('click', () => {
      this.showAnswer();
    });

    // 戻るボタン
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.hideExercise();
    });

    // 次へボタン
    document.getElementById('next-btn')?.addEventListener('click', () => {
      this.nextExercise();
    });

    // 次へボタン（エディタ下部）
    document.getElementById('next-btn-editor')?.addEventListener('click', () => {
      this.nextExercise();
    });

    // 前へボタン
    document.getElementById('prev-btn')?.addEventListener('click', () => {
      this.prevExercise();
    });

    // ヒント表示
    document.querySelector('.hint-toggle')?.addEventListener('click', (e) => {
      const hintText = e.target.nextElementSibling;
      hintText.classList.toggle('show');
      e.target.textContent = hintText.classList.contains('show') ? '− ヒントを隠す' : '+ ヒントを見る';
    });

    // リアルタイムプレビュー
    document.getElementById('code-editor')?.addEventListener('input', () => {
      this.runCode();
    });

    // エディタの拡張機能を設定
    this.setupEditorEnhancements();

    // エディタリセットボタン
    document.getElementById('reset-editor-btn')?.addEventListener('click', () => {
      this.resetEditor();
    });

    // 進捗リセットボタン
    document.getElementById('reset-progress-btn')?.addEventListener('click', () => {
      this.resetProgress();
    });
  }

  resetEditor() {
    const exercise = this.exercises[this.currentIndex];
    const editor = document.getElementById('code-editor');
    editor.value = exercise.starter || '';
    document.getElementById('result-message').className = 'result-message';
    document.getElementById('answer-section').classList.remove('show');
    this.runCode();
  }

  resetProgress() {
    if (confirm('進捗をリセットしますか？すべての完了状態がクリアされます。')) {
      this.completed = [];
      localStorage.removeItem(this.completedKey);
      this.renderExerciseList();
      this.updateProgress();
    }
  }

  setupEditorEnhancements() {
    const editor = document.getElementById('code-editor');
    if (!editor) return;

    // 自動補完のペア
    const pairs = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`',
      '<': '>'
    };

    // HTMLタグ名を抽出する正規表現
    const tagPattern = /<([a-zA-Z][a-zA-Z0-9]*)[^>]*>$/;

    // キーダウンイベント
    editor.addEventListener('keydown', (e) => {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const value = editor.value;

      // Tabキーでインデント
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: インデント解除
          const lineStart = value.lastIndexOf('\n', start - 1) + 1;
          const lineContent = value.substring(lineStart, start);
          if (lineContent.startsWith('  ')) {
            editor.value = value.substring(0, lineStart) + value.substring(lineStart + 2);
            editor.selectionStart = editor.selectionEnd = start - 2;
          }
        } else {
          // Tab: インデント追加
          editor.value = value.substring(0, start) + '  ' + value.substring(end);
          editor.selectionStart = editor.selectionEnd = start + 2;
        }
        this.runCode();
        return;
      }

      // Enterキーで自動インデント
      if (e.key === 'Enter') {
        e.preventDefault();
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineContent = value.substring(lineStart, start);
        const indent = lineContent.match(/^(\s*)/)[1];

        // カーソル前後の文字をチェック
        const charBefore = value[start - 1];
        const charAfter = value[start];

        // {}, [], () の間でEnterを押した場合
        if ((charBefore === '{' && charAfter === '}') ||
            (charBefore === '[' && charAfter === ']') ||
            (charBefore === '(' && charAfter === ')')) {
          editor.value = value.substring(0, start) + '\n' + indent + '  \n' + indent + value.substring(end);
          editor.selectionStart = editor.selectionEnd = start + indent.length + 3;
        }
        // > と </ の間でEnterを押した場合（HTMLタグ）
        else if (charBefore === '>' && value.substring(start, start + 2) === '</') {
          editor.value = value.substring(0, start) + '\n' + indent + '  \n' + indent + value.substring(end);
          editor.selectionStart = editor.selectionEnd = start + indent.length + 3;
        }
        else {
          editor.value = value.substring(0, start) + '\n' + indent + value.substring(end);
          editor.selectionStart = editor.selectionEnd = start + indent.length + 1;
        }
        this.runCode();
        return;
      }

      // 括弧・引用符の自動補完
      if (pairs[e.key]) {
        // 選択範囲がある場合は囲む
        if (start !== end) {
          e.preventDefault();
          const selected = value.substring(start, end);
          editor.value = value.substring(0, start) + e.key + selected + pairs[e.key] + value.substring(end);
          editor.selectionStart = start + 1;
          editor.selectionEnd = end + 1;
          this.runCode();
          return;
        }

        // < の場合は特別処理（タグ補完用）
        if (e.key === '<') {
          // 自動補完しない（後で閉じタグを生成する）
          return;
        }

        // 次の文字が同じ閉じ文字の場合はスキップ
        if (value[start] === pairs[e.key] && (e.key === '"' || e.key === "'" || e.key === '`')) {
          e.preventDefault();
          editor.selectionStart = editor.selectionEnd = start + 1;
          return;
        }

        // 自動補完
        e.preventDefault();
        editor.value = value.substring(0, start) + e.key + pairs[e.key] + value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 1;
        this.runCode();
        return;
      }

      // 閉じ括弧を打った時、次が同じ文字ならスキップ
      if ([')', ']', '}', '>'].includes(e.key) && value[start] === e.key) {
        e.preventDefault();
        editor.selectionStart = editor.selectionEnd = start + 1;
        return;
      }

      // Backspaceで空のペアを削除
      if (e.key === 'Backspace' && start === end && start > 0) {
        const charBefore = value[start - 1];
        const charAfter = value[start];
        if (pairs[charBefore] === charAfter) {
          e.preventDefault();
          editor.value = value.substring(0, start - 1) + value.substring(end + 1);
          editor.selectionStart = editor.selectionEnd = start - 1;
          this.runCode();
          return;
        }
      }
    });

    // HTMLタグの自動閉じ（inputイベント）
    editor.addEventListener('input', (e) => {
      if (e.inputType !== 'insertText') return;

      const start = editor.selectionStart;
      const value = editor.value;

      // > を入力した時、開きタグを検出して閉じタグを生成
      if (e.data === '>') {
        const beforeCursor = value.substring(0, start);
        const match = beforeCursor.match(/<([a-zA-Z][a-zA-Z0-9]*)(?:\s[^>]*)?>$/);

        if (match) {
          const tagName = match[1].toLowerCase();
          // 自己閉じタグは閉じタグ不要
          const selfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];

          if (!selfClosing.includes(tagName)) {
            // 既に閉じタグがあるかチェック
            const afterCursor = value.substring(start);
            if (!afterCursor.startsWith(`</${tagName}>`)) {
              editor.value = value.substring(0, start) + `</${tagName}>` + value.substring(start);
              editor.selectionStart = editor.selectionEnd = start;
            }
          }
        }
      }

      // / を入力した時、</ の後にタグ名を自動補完
      if (e.data === '/') {
        const beforeCursor = value.substring(0, start);
        if (beforeCursor.endsWith('</')) {
          // 最後に開いたタグを探す
          const openTags = [];
          const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
          let match;
          const textBefore = beforeCursor.slice(0, -2); // '</' を除く

          while ((match = tagRegex.exec(textBefore)) !== null) {
            const isClosing = match[0][1] === '/';
            const tagName = match[1].toLowerCase();
            const selfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];

            if (selfClosing.includes(tagName)) continue;

            if (isClosing) {
              const idx = openTags.lastIndexOf(tagName);
              if (idx !== -1) openTags.splice(idx, 1);
            } else {
              openTags.push(tagName);
            }
          }

          if (openTags.length > 0) {
            const lastTag = openTags[openTags.length - 1];
            editor.value = value.substring(0, start) + lastTag + '>' + value.substring(start);
            editor.selectionStart = editor.selectionEnd = start + lastTag.length + 1;
          }
        }
      }
    });
  }

  updateProgress() {
    const totalEl = document.getElementById('total-count');
    const completedEl = document.getElementById('completed-count');
    const progressEl = document.getElementById('progress-fill');

    if (totalEl) totalEl.textContent = this.exercises.length;
    if (completedEl) completedEl.textContent = this.completed.length;
    if (progressEl) progressEl.style.width = `${(this.completed.length / this.exercises.length) * 100}%`;
  }

  showExercise() {
    const exercise = this.exercises[this.currentIndex];
    const levelInfo = LEVELS[exercise.level];

    document.getElementById('exercise-list-section').style.display = 'none';
    document.getElementById('exercise-container').classList.add('active');

    // 問題情報を更新
    document.getElementById('exercise-number').textContent = `問題 ${this.currentIndex + 1} / ${this.exercises.length}`;
    document.getElementById('current-level').textContent = levelInfo.name;
    document.getElementById('current-level').style.background = levelInfo.color;
    document.getElementById('exercise-title').textContent = exercise.title;
    document.getElementById('exercise-description').textContent = exercise.description;
    document.getElementById('exercise-task').innerHTML = exercise.task;
    document.getElementById('hint-text').textContent = exercise.hint;

    // エディタをリセット
    const editor = document.getElementById('code-editor');
    editor.value = exercise.starter || '';
    editor.placeholder = exercise.placeholder || 'ここにコードを入力...';

    // 結果と解答をリセット
    document.getElementById('result-message').className = 'result-message';
    document.getElementById('result-message').textContent = '';
    document.getElementById('answer-section').classList.remove('show');
    document.querySelector('.hint-text').classList.remove('show');
    document.querySelector('.hint-toggle').textContent = '+ ヒントを見る';

    // プレビューをリセット
    document.getElementById('preview-content').innerHTML = '';

    // ナビゲーションボタンの状態
    document.getElementById('prev-btn').disabled = this.currentIndex === 0;
    document.getElementById('next-btn').disabled = this.currentIndex === this.exercises.length - 1;
    const nextBtnEditor = document.getElementById('next-btn-editor');
    if (nextBtnEditor) nextBtnEditor.disabled = this.currentIndex === this.exercises.length - 1;

    // 初期プレビュー
    this.runCode();
  }

  hideExercise() {
    document.getElementById('exercise-list-section').style.display = 'block';
    document.getElementById('exercise-container').classList.remove('active');
    this.renderExerciseList();
    this.updateProgress();
  }

  runCode() {
    const code = document.getElementById('code-editor').value;
    const preview = document.getElementById('preview-content');
    const exercise = this.exercises[this.currentIndex];

    if (exercise.type === 'html') {
      preview.innerHTML = code;
    } else if (exercise.type === 'css') {
      const html = exercise.previewHtml || '';
      preview.innerHTML = `<style>${code}</style>${html}`;
    } else if (exercise.type === 'javascript') {
      this.runJavaScript(code, preview, exercise);
    } else if (exercise.type === 'dom') {
      this.runDOMExercise(code, preview, exercise);
    }
  }

  runJavaScript(code, preview, exercise) {
    const logs = [];
    const originalLog = console.log;

    // console.logをキャプチャ
    console.log = (...args) => {
      logs.push(args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join(' '));
    };

    try {
      // 初期コードがあれば実行
      if (exercise.setupCode) {
        eval(exercise.setupCode);
      }
      // ユーザーコードを実行
      eval(code);

      preview.innerHTML = `<div class="console-output">
        <div class="console-header">Console Output</div>
        <pre class="console-logs">${logs.length > 0 ? logs.join('\n') : '(出力なし)'}</pre>
      </div>`;
    } catch (error) {
      preview.innerHTML = `<div class="console-output error">
        <div class="console-header">Error</div>
        <pre class="console-logs">${error.message}</pre>
      </div>`;
    } finally {
      console.log = originalLog;
    }
  }

  runDOMExercise(code, preview, exercise) {
    const logs = [];
    const originalLog = console.log;

    // console.logをキャプチャ
    console.log = (...args) => {
      logs.push(args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join(' '));
    };

    try {
      // プレビュー領域にHTMLを設置
      const htmlContent = exercise.previewHtml || '<div id="app"></div>';
      const cssContent = exercise.previewCss || '';
      preview.innerHTML = `<style>${cssContent}</style><div id="dom-preview">${htmlContent}</div>`;

      // DOM操作用のdocument参照を作成
      const domPreview = preview.querySelector('#dom-preview');

      // ユーザーコードをDOM操作可能な形で実行
      const wrappedCode = `
        (function(document, window) {
          const _querySelector = document.querySelector.bind(document);
          const _querySelectorAll = document.querySelectorAll.bind(document);
          const _getElementById = document.getElementById.bind(document);
          const _getElementsByClassName = document.getElementsByClassName.bind(document);
          const _getElementsByTagName = document.getElementsByTagName.bind(document);
          const _createElement = document.createElement.bind(document);

          // プレビュー領域内での操作に限定
          document.querySelector = (sel) => domPreview.querySelector(sel);
          document.querySelectorAll = (sel) => domPreview.querySelectorAll(sel);
          document.getElementById = (id) => domPreview.querySelector('#' + id);
          document.getElementsByClassName = (cls) => domPreview.getElementsByClassName(cls);
          document.getElementsByTagName = (tag) => domPreview.getElementsByTagName(tag);
          document.body = domPreview;

          ${code}

          // 元に戻す
          document.querySelector = _querySelector;
          document.querySelectorAll = _querySelectorAll;
          document.getElementById = _getElementById;
          document.getElementsByClassName = _getElementsByClassName;
          document.getElementsByTagName = _getElementsByTagName;
        })(document, window);
      `;

      eval(wrappedCode);

      // コンソール出力があれば表示
      if (logs.length > 0) {
        const consoleDiv = document.createElement('div');
        consoleDiv.className = 'console-output';
        consoleDiv.innerHTML = `<div class="console-header">Console</div><pre class="console-logs">${logs.join('\n')}</pre>`;
        preview.appendChild(consoleDiv);
      }
    } catch (error) {
      preview.innerHTML = `<div class="console-output error">
        <div class="console-header">Error</div>
        <pre class="console-logs">${error.message}</pre>
      </div>`;
    } finally {
      console.log = originalLog;
    }
  }

  checkAnswer() {
    const code = document.getElementById('code-editor').value;
    const exercise = this.exercises[this.currentIndex];
    const resultEl = document.getElementById('result-message');

    const normalizedCode = this.normalizeCode(code);
    let isCorrect = true;
    let feedback = '';

    // 必須要素チェック
    if (exercise.requiredElements) {
      for (const element of exercise.requiredElements) {
        if (!normalizedCode.includes(element.toLowerCase())) {
          isCorrect = false;
          feedback = `「${element}」が含まれていません`;
          break;
        }
      }
    }

    // 禁止要素チェック
    if (isCorrect && exercise.forbiddenElements) {
      for (const element of exercise.forbiddenElements) {
        if (normalizedCode.includes(element.toLowerCase())) {
          isCorrect = false;
          feedback = `「${element}」は使用しないでください`;
          break;
        }
      }
    }

    // カスタム検証
    if (isCorrect && exercise.validator) {
      const validationResult = exercise.validator(code);
      if (!validationResult.valid) {
        isCorrect = false;
        feedback = validationResult.message;
      }
    }

    if (isCorrect) {
      const successMessages = [
        '正解です！素晴らしい！',
        'パーフェクト！よくできました！',
        '完璧！その調子！',
        'お見事！正解です！',
        'すごい！大正解！'
      ];
      resultEl.className = 'result-message show correct';
      resultEl.innerHTML = successMessages[Math.floor(Math.random() * successMessages.length)];
      this.markCompleted(this.currentIndex);
      this.updateProgress();
      this.showCelebration();
    } else {
      const encourageMessages = [
        'もう少し！ヒントを参考にしてみてください。',
        '惜しい！もう一度挑戦してみよう！',
        'がんばって！答えに近づいています！',
        'ドンマイ！ヒントをチェックしてみて！'
      ];
      resultEl.className = 'result-message show incorrect';
      resultEl.innerHTML = feedback || encourageMessages[Math.floor(Math.random() * encourageMessages.length)];
    }
  }

  showCelebration() {
    // 紙吹雪エフェクト
    this.createConfetti();

    // 画面フラッシュ
    const container = document.getElementById('exercise-container');
    container.classList.add('correct-flash');
    setTimeout(() => container.classList.remove('correct-flash'), 300);

    // 次へボタンをハイライト
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.classList.add('btn-next-highlight');
      setTimeout(() => nextBtn.classList.remove('btn-next-highlight'), 3000);
    }

    // 答え合わせボタンを成功状態に
    const checkBtn = document.getElementById('check-btn');
    checkBtn.classList.add('btn-success-state');
    checkBtn.innerHTML = '🎉 正解！';
    setTimeout(() => {
      checkBtn.classList.remove('btn-success-state');
      checkBtn.innerHTML = '✓ 答え合わせ';
    }, 2000);
  }

  createConfetti() {
    const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';

      // ランダムな形状
      const shapes = ['circle', 'square', 'triangle'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      if (shape === 'circle') {
        confetti.style.borderRadius = '50%';
      } else if (shape === 'triangle') {
        confetti.style.width = '0';
        confetti.style.height = '0';
        confetti.style.borderLeft = '5px solid transparent';
        confetti.style.borderRight = '5px solid transparent';
        confetti.style.borderBottom = '10px solid ' + colors[Math.floor(Math.random() * colors.length)];
        confetti.style.backgroundColor = 'transparent';
      }

      confettiContainer.appendChild(confetti);
    }

    // 3秒後に削除
    setTimeout(() => {
      confettiContainer.remove();
    }, 3500);
  }

  normalizeCode(code) {
    return code.toLowerCase().replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
  }

  showAnswer() {
    const exercise = this.exercises[this.currentIndex];
    document.getElementById('answer-code').textContent = exercise.answer;
    document.getElementById('answer-section').classList.add('show');
  }

  markCompleted(index) {
    if (!this.completed.includes(index)) {
      this.completed.push(index);
      localStorage.setItem(this.completedKey, JSON.stringify(this.completed));
    }
  }

  nextExercise() {
    if (this.currentIndex < this.exercises.length - 1) {
      this.currentIndex++;
      this.showExercise();
    }
  }

  prevExercise() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.showExercise();
    }
  }
}

// ==================== HTML問題 30問 ====================
const htmlExercises = [
  // ===== 入門（レベル1）6問 =====
  {
    level: 1,
    title: 'はじめての見出し',
    description: '一番大きな見出しタグを使ってみよう',
    task: '「Hello World」という文字をh1タグで表示してください。',
    hint: 'h1タグは <h1>内容</h1> のように書きます',
    type: 'html',
    starter: '',
    placeholder: '<h1>ここに文字</h1>',
    answer: '<h1>Hello World</h1>',
    requiredElements: ['<h1>', '</h1>', 'hello world']
  },
  {
    level: 1,
    title: '段落を作ろう',
    description: '文章を段落で囲んでみよう',
    task: '「これは段落です。」という文章をpタグで囲んでください。',
    hint: 'pタグは段落（paragraph）を表します',
    type: 'html',
    starter: '',
    placeholder: '<p>文章</p>',
    answer: '<p>これは段落です。</p>',
    requiredElements: ['<p>', '</p>', 'これは段落です']
  },
  {
    level: 1,
    title: '改行してみよう',
    description: '文章の途中で改行する方法を学ぼう',
    task: '「こんにちは」と「さようなら」を改行して表示してください。brタグを使います。',
    hint: 'brタグは <br> だけで、閉じタグは不要です',
    type: 'html',
    starter: '',
    placeholder: '1行目<br>2行目',
    answer: 'こんにちは<br>さようなら',
    requiredElements: ['こんにちは', '<br>', 'さようなら']
  },
  {
    level: 1,
    title: '太字にしよう',
    description: '文字を太字にする方法を学ぼう',
    task: '「重要」という文字をstrongタグで太字にしてください。',
    hint: 'strongタグは重要なテキストを示し、太字で表示されます',
    type: 'html',
    starter: '',
    placeholder: '<strong>テキスト</strong>',
    answer: '<strong>重要</strong>',
    requiredElements: ['<strong>', '</strong>', '重要']
  },
  {
    level: 1,
    title: '斜体にしよう',
    description: '文字を斜体（イタリック）にする方法を学ぼう',
    task: '「注目」という文字をemタグで斜体にしてください。',
    hint: 'emタグは強調を表し、斜体で表示されます',
    type: 'html',
    starter: '',
    placeholder: '<em>テキスト</em>',
    answer: '<em>注目</em>',
    requiredElements: ['<em>', '</em>', '注目']
  },
  {
    level: 1,
    title: '水平線を引こう',
    description: 'コンテンツを区切る水平線を表示しよう',
    task: '「セクション1」と「セクション2」の間に水平線（hr）を入れてください。',
    hint: 'hrタグは <hr> だけで使えます',
    type: 'html',
    starter: 'セクション1\n\nセクション2',
    answer: 'セクション1\n<hr>\nセクション2',
    requiredElements: ['セクション1', '<hr>', 'セクション2']
  },

  // ===== 初級（レベル2）6問 =====
  {
    level: 2,
    title: '見出しの階層',
    description: '見出しタグの階層構造を学ぼう',
    task: 'h1で「タイトル」、h2で「サブタイトル」を作ってください。',
    hint: 'h1が最も大きく、h2, h3...と小さくなります',
    type: 'html',
    starter: '',
    placeholder: '<h1>タイトル</h1>\n<h2>サブタイトル</h2>',
    answer: '<h1>タイトル</h1>\n<h2>サブタイトル</h2>',
    requiredElements: ['<h1>', '</h1>', '<h2>', '</h2>', 'タイトル', 'サブタイトル']
  },
  {
    level: 2,
    title: 'リンクを作ろう',
    description: 'クリックできるリンクを作成しよう',
    task: '「Google」というテキストで https://google.com へのリンクを作ってください。',
    hint: '<a href="URL">テキスト</a> の形式で書きます',
    type: 'html',
    starter: '',
    placeholder: '<a href="URL">テキスト</a>',
    answer: '<a href="https://google.com">Google</a>',
    requiredElements: ['<a', 'href=', 'https://google.com', '</a>', 'google']
  },
  {
    level: 2,
    title: '箇条書きリスト',
    description: '順序なしリストを作ってみよう',
    task: '「赤」「青」「緑」を箇条書きリスト（ul）で表示してください。',
    hint: 'ulタグの中にliタグで各項目を入れます',
    type: 'html',
    starter: '<ul>\n\n</ul>',
    answer: '<ul>\n  <li>赤</li>\n  <li>青</li>\n  <li>緑</li>\n</ul>',
    requiredElements: ['<ul>', '</ul>', '<li>', '</li>', '赤', '青', '緑']
  },
  {
    level: 2,
    title: '番号付きリスト',
    description: '順序付きリストを作ってみよう',
    task: '「準備」「開始」「終了」を番号付きリスト（ol）で表示してください。',
    hint: 'olタグを使うと自動で番号が付きます',
    type: 'html',
    starter: '<ol>\n\n</ol>',
    answer: '<ol>\n  <li>準備</li>\n  <li>開始</li>\n  <li>終了</li>\n</ol>',
    requiredElements: ['<ol>', '</ol>', '<li>', '</li>', '準備', '開始', '終了']
  },
  {
    level: 2,
    title: '画像を表示しよう',
    description: '画像タグの使い方を学ぼう',
    task: 'src="cat.jpg"、alt="猫の写真" で画像を表示してください。',
    hint: 'imgタグはsrc属性とalt属性を使います。閉じタグは不要です',
    type: 'html',
    starter: '',
    placeholder: '<img src="ファイル名" alt="説明">',
    answer: '<img src="cat.jpg" alt="猫の写真">',
    requiredElements: ['<img', 'src=', 'cat.jpg', 'alt=', '猫の写真']
  },
  {
    level: 2,
    title: 'divで囲もう',
    description: 'コンテンツをグループ化する方法を学ぼう',
    task: '「コンテンツ」という文字をdivタグで囲んでください。',
    hint: 'divタグはグループ化に使う汎用的なタグです',
    type: 'html',
    starter: '',
    placeholder: '<div>内容</div>',
    answer: '<div>コンテンツ</div>',
    requiredElements: ['<div>', '</div>', 'コンテンツ']
  },

  // ===== 中級（レベル3）6問 =====
  {
    level: 3,
    title: '新しいタブでリンク',
    description: 'リンクを新しいタブで開く方法を学ぼう',
    task: '「外部サイト」というリンクを https://example.com へ、新しいタブで開くように作ってください。',
    hint: 'target="_blank" を追加します',
    type: 'html',
    starter: '',
    answer: '<a href="https://example.com" target="_blank">外部サイト</a>',
    requiredElements: ['<a', 'href=', 'target=', '_blank', '</a>']
  },
  {
    level: 3,
    title: 'クラスを付けよう',
    description: 'CSSで装飾するためのクラス属性を学ぼう',
    task: 'pタグに class="message" を付けて「お知らせ」と表示してください。',
    hint: 'class属性は class="クラス名" の形式で書きます',
    type: 'html',
    starter: '',
    answer: '<p class="message">お知らせ</p>',
    requiredElements: ['<p', 'class=', 'message', '</p>', 'お知らせ']
  },
  {
    level: 3,
    title: 'IDを付けよう',
    description: '要素を一意に識別するID属性を学ぼう',
    task: 'divタグに id="header" を付けて「ヘッダー」と表示してください。',
    hint: 'id属性はページ内で一意である必要があります',
    type: 'html',
    starter: '',
    answer: '<div id="header">ヘッダー</div>',
    requiredElements: ['<div', 'id=', 'header', '</div>', 'ヘッダー']
  },
  {
    level: 3,
    title: 'spanでインライン装飾',
    description: 'テキストの一部だけを装飾する方法を学ぼう',
    task: '「今日は<span class="highlight">特別</span>な日です」というHTMLを作ってください。',
    hint: 'spanタグはインライン要素で、文章の一部を囲めます',
    type: 'html',
    starter: '',
    answer: '今日は<span class="highlight">特別</span>な日です',
    requiredElements: ['<span', 'class=', 'highlight', '</span>', '特別']
  },
  {
    level: 3,
    title: '入れ子のリスト',
    description: 'リストの中にリストを入れる方法を学ぼう',
    task: '「果物」の下に「りんご」「みかん」をサブリストとして作ってください。',
    hint: 'liタグの中にulタグを入れることができます',
    type: 'html',
    starter: '<ul>\n  <li>果物\n    \n  </li>\n</ul>',
    answer: '<ul>\n  <li>果物\n    <ul>\n      <li>りんご</li>\n      <li>みかん</li>\n    </ul>\n  </li>\n</ul>',
    requiredElements: ['果物', 'りんご', 'みかん', '<ul>', '</ul>', '<li>', '</li>']
  },
  {
    level: 3,
    title: '説明リスト',
    description: '用語と説明のペアを作るdlタグを学ぼう',
    task: 'dlタグを使って「HTML」の説明「マークアップ言語」を作ってください。',
    hint: 'dlの中にdt（用語）とdd（説明）を入れます',
    type: 'html',
    starter: '<dl>\n\n</dl>',
    answer: '<dl>\n  <dt>HTML</dt>\n  <dd>マークアップ言語</dd>\n</dl>',
    requiredElements: ['<dl>', '</dl>', '<dt>', '</dt>', '<dd>', '</dd>', 'html', 'マークアップ言語']
  },

  // ===== 中上級（レベル4）6問 =====
  {
    level: 4,
    title: 'テーブルを作ろう',
    description: '表（テーブル）の基本構造を学ぼう',
    task: '2行2列の表を作成。ヘッダー行に「名前」「年齢」、データ行に「太郎」「20」を入れてください。',
    hint: 'thead, tbody, tr, th, td タグを使います',
    type: 'html',
    starter: '<table>\n\n</table>',
    answer: '<table>\n  <thead>\n    <tr>\n      <th>名前</th>\n      <th>年齢</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>太郎</td>\n      <td>20</td>\n    </tr>\n  </tbody>\n</table>',
    requiredElements: ['<table>', '</table>', '<thead>', '<tbody>', '<tr>', '<th>', '<td>', '名前', '年齢', '太郎', '20']
  },
  {
    level: 4,
    title: '入力フォーム',
    description: 'テキスト入力欄を作ってみよう',
    task: 'labelが「名前:」で、inputのtype="text"、name="username" のフォーム部品を作ってください。',
    hint: 'labelのfor属性とinputのid属性を一致させます',
    type: 'html',
    starter: '',
    answer: '<label for="username">名前:</label>\n<input type="text" id="username" name="username">',
    requiredElements: ['<label', '</label>', '<input', 'type=', 'text', 'name=', 'username']
  },
  {
    level: 4,
    title: 'セレクトボックス',
    description: '選択肢から選ぶドロップダウンを作ろう',
    task: '「東京」「大阪」「名古屋」から選べるセレクトボックスを作ってください。name="city"',
    hint: 'selectタグの中にoptionタグを入れます',
    type: 'html',
    starter: '',
    answer: '<select name="city">\n  <option value="tokyo">東京</option>\n  <option value="osaka">大阪</option>\n  <option value="nagoya">名古屋</option>\n</select>',
    requiredElements: ['<select', '</select>', '<option', '</option>', '東京', '大阪', '名古屋', 'name=']
  },
  {
    level: 4,
    title: 'チェックボックス',
    description: '複数選択できるチェックボックスを作ろう',
    task: '「利用規約に同意する」のチェックボックスを作ってください。name="agree"',
    hint: 'type="checkbox" を使います',
    type: 'html',
    starter: '',
    answer: '<label>\n  <input type="checkbox" name="agree">\n  利用規約に同意する\n</label>',
    requiredElements: ['<input', 'type=', 'checkbox', 'name=', 'agree', '利用規約に同意する']
  },
  {
    level: 4,
    title: 'セマンティックHTML - header/main/footer',
    description: 'ページ構造を意味的に正しく作ろう',
    task: 'header、main、footerタグを使って、それぞれ「ヘッダー」「メイン」「フッター」と表示してください。',
    hint: 'セマンティックタグはページの構造を明確にします',
    type: 'html',
    starter: '',
    answer: '<header>ヘッダー</header>\n<main>メイン</main>\n<footer>フッター</footer>',
    requiredElements: ['<header>', '</header>', '<main>', '</main>', '<footer>', '</footer>']
  },
  {
    level: 4,
    title: 'nav と article',
    description: 'ナビゲーションと記事のセマンティックタグを学ぼう',
    task: 'navタグ内に「ホーム」「概要」のリンク（#）を、articleタグ内に「記事本文」を配置してください。',
    hint: 'navはナビゲーション、articleは独立したコンテンツに使います',
    type: 'html',
    starter: '',
    answer: '<nav>\n  <a href="#">ホーム</a>\n  <a href="#">概要</a>\n</nav>\n<article>記事本文</article>',
    requiredElements: ['<nav>', '</nav>', '<article>', '</article>', 'ホーム', '概要', '記事本文']
  },

  // ===== 上級（レベル5）6問 =====
  {
    level: 5,
    title: '完全なフォーム',
    description: '送信ボタン付きのフォームを完成させよう',
    task: 'formタグ（action="/submit" method="post"）で、名前入力欄と送信ボタンを含むフォームを作ってください。',
    hint: 'buttonタグまたはinput type="submit"で送信ボタンを作れます',
    type: 'html',
    starter: '',
    answer: '<form action="/submit" method="post">\n  <label for="name">名前:</label>\n  <input type="text" id="name" name="name">\n  <button type="submit">送信</button>\n</form>',
    requiredElements: ['<form', 'action=', 'method=', 'post', '</form>', '<input', '<button', '</button>']
  },
  {
    level: 5,
    title: 'テキストエリア',
    description: '複数行テキスト入力を作ろう',
    task: 'textareaタグで、name="comment"、rows="4"、cols="40"、placeholder="コメントを入力" を設定してください。',
    hint: 'textareaは開始タグと終了タグが必要です',
    type: 'html',
    starter: '',
    answer: '<textarea name="comment" rows="4" cols="40" placeholder="コメントを入力"></textarea>',
    requiredElements: ['<textarea', '</textarea>', 'name=', 'rows=', 'cols=', 'placeholder=']
  },
  {
    level: 5,
    title: 'figure と figcaption',
    description: '画像にキャプションを付けよう',
    task: 'figureタグ内に画像（src="photo.jpg" alt="写真"）とfigcaptionで「風景写真」を配置してください。',
    hint: 'figureは図表を表し、figcaptionはその説明です',
    type: 'html',
    starter: '',
    answer: '<figure>\n  <img src="photo.jpg" alt="写真">\n  <figcaption>風景写真</figcaption>\n</figure>',
    requiredElements: ['<figure>', '</figure>', '<img', '<figcaption>', '</figcaption>', '風景写真']
  },
  {
    level: 5,
    title: 'details と summary',
    description: '折りたたみ可能なコンテンツを作ろう',
    task: 'detailsタグとsummaryタグを使って、「詳細を見る」をクリックすると「ここに詳細内容があります」が表示されるようにしてください。',
    hint: 'summaryがクリック可能な部分、他のコンテンツが折りたたまれる部分です',
    type: 'html',
    starter: '',
    answer: '<details>\n  <summary>詳細を見る</summary>\n  ここに詳細内容があります\n</details>',
    requiredElements: ['<details>', '</details>', '<summary>', '</summary>', '詳細を見る', 'ここに詳細内容があります']
  },
  {
    level: 5,
    title: 'データ属性',
    description: 'カスタムデータ属性を使おう',
    task: 'divタグに data-user-id="123" と data-role="admin" を設定し、「管理者」と表示してください。',
    hint: 'data-*属性でカスタムデータを持たせられます',
    type: 'html',
    starter: '',
    answer: '<div data-user-id="123" data-role="admin">管理者</div>',
    requiredElements: ['<div', 'data-user-id=', '123', 'data-role=', 'admin', '</div>', '管理者']
  },
  {
    level: 5,
    title: '完全なHTML文書',
    description: 'DOCTYPE宣言からの完全なHTML構造を作ろう',
    task: 'DOCTYPE、html(lang="ja")、head(meta charset, title「テスト」)、body(h1「見出し」)を含む完全なHTMLを作ってください。',
    hint: '全ての要素を正しい順序で配置します',
    type: 'html',
    starter: '',
    answer: '<!DOCTYPE html>\n<html lang="ja">\n<head>\n  <meta charset="UTF-8">\n  <title>テスト</title>\n</head>\n<body>\n  <h1>見出し</h1>\n</body>\n</html>',
    requiredElements: ['<!doctype html>', '<html', 'lang=', 'ja', '<head>', '<meta', 'charset=', '<title>', '</title>', '<body>', '</body>', '</html>']
  },

  // ===== 実践（レベル6）6問 =====
  {
    level: 6,
    title: 'お問い合わせフォーム',
    description: '実務でよく使うお問い合わせフォームを作ろう',
    task: 'formタグ内に、名前(text)、メール(email)、お問い合わせ内容(textarea)、送信ボタンを含むフォームを作ってください。各入力欄にはlabelを付けてください。',
    hint: 'label、input、textarea、buttonタグを組み合わせます',
    type: 'html',
    starter: '<form action="/contact" method="post">\n\n</form>',
    answer: '<form action="/contact" method="post">\n  <label for="name">名前</label>\n  <input type="text" id="name" name="name" required>\n  \n  <label for="email">メールアドレス</label>\n  <input type="email" id="email" name="email" required>\n  \n  <label for="message">お問い合わせ内容</label>\n  <textarea id="message" name="message" rows="5" required></textarea>\n  \n  <button type="submit">送信</button>\n</form>',
    requiredElements: ['<form', '<label', '<input', 'type="text"', 'type="email"', '<textarea', '</textarea>', '<button', '</button>', 'name=', 'email=']
  },
  {
    level: 6,
    title: 'ブログ記事構造',
    description: 'セマンティックなブログ記事のHTML構造を作ろう',
    task: 'articleタグ内に、header(h1タイトル、time日付、author情報)、本文(複数のp)、footer(タグリスト)を含む記事構造を作ってください。',
    hint: 'article > header + 本文 + footer の構造を意識します',
    type: 'html',
    starter: '',
    answer: '<article>\n  <header>\n    <h1>記事タイトル</h1>\n    <p><time datetime="2024-01-15">2024年1月15日</time> | <span class="author">田中太郎</span></p>\n  </header>\n  \n  <p>記事の本文がここに入ります。</p>\n  <p>続きの段落です。</p>\n  \n  <footer>\n    <p>タグ: <a href="#">HTML</a>, <a href="#">Web開発</a></p>\n  </footer>\n</article>',
    requiredElements: ['<article>', '</article>', '<header>', '</header>', '<h1>', '<time', 'datetime=', '<footer>', '</footer>', '<p>']
  },
  {
    level: 6,
    title: '商品カード',
    description: 'ECサイトの商品カードHTMLを作ろう',
    task: 'divタグ(class="product-card")内に、商品画像、商品名(h3)、価格、「カートに入れる」ボタンを含むカード構造を作ってください。',
    hint: '画像、テキスト、ボタンを適切な順序で配置します',
    type: 'html',
    starter: '',
    answer: '<div class="product-card">\n  <img src="product.jpg" alt="商品画像">\n  <h3>商品名</h3>\n  <p class="price">¥1,980</p>\n  <p class="description">商品の説明文がここに入ります。</p>\n  <button type="button">カートに入れる</button>\n</div>',
    requiredElements: ['<div', 'class=', 'product-card', '<img', 'src=', 'alt=', '<h3>', '</h3>', '<p', '<button', '</button>']
  },
  {
    level: 6,
    title: 'ナビゲーションメニュー',
    description: 'ヘッダーナビゲーションを作ろう',
    task: 'headerタグ内に、ロゴ(div class="logo")とnavタグ(ul/liでメニュー5項目)を含むナビゲーション構造を作ってください。',
    hint: 'header > div.logo + nav > ul > li > a の構造です',
    type: 'html',
    starter: '',
    answer: '<header>\n  <div class="logo">サイト名</div>\n  <nav>\n    <ul>\n      <li><a href="/">ホーム</a></li>\n      <li><a href="/about">会社概要</a></li>\n      <li><a href="/services">サービス</a></li>\n      <li><a href="/blog">ブログ</a></li>\n      <li><a href="/contact">お問い合わせ</a></li>\n    </ul>\n  </nav>\n</header>',
    requiredElements: ['<header>', '</header>', '<div', 'class=', 'logo', '<nav>', '</nav>', '<ul>', '</ul>', '<li>', '</li>', '<a', 'href=']
  },
  {
    level: 6,
    title: 'フッターセクション',
    description: '複数カラムのフッターを作ろう',
    task: 'footerタグ内に、3つのセクション(会社情報、リンク集、SNSリンク)とコピーライトを含むフッター構造を作ってください。',
    hint: 'footer内に複数のdivでセクションを分けます',
    type: 'html',
    starter: '',
    answer: '<footer>\n  <div class="footer-section">\n    <h4>会社情報</h4>\n    <p>株式会社サンプル</p>\n    <p>〒100-0001 東京都千代田区</p>\n  </div>\n  <div class="footer-section">\n    <h4>リンク</h4>\n    <ul>\n      <li><a href="#">プライバシーポリシー</a></li>\n      <li><a href="#">利用規約</a></li>\n    </ul>\n  </div>\n  <div class="footer-section">\n    <h4>SNS</h4>\n    <a href="#">Twitter</a>\n    <a href="#">Facebook</a>\n  </div>\n  <p class="copyright">&copy; 2024 Company Name</p>\n</footer>',
    requiredElements: ['<footer>', '</footer>', '<div', 'class=', '<h4>', '</h4>', '<ul>', '<li>', '<a', 'href=', '&copy;']
  },
  {
    level: 6,
    title: 'レビュー・口コミセクション',
    description: 'ユーザーレビューの表示構造を作ろう',
    task: 'sectionタグ内に、見出しと2つのレビューカード(ユーザー名、星評価、コメント、日付)を含む構造を作ってください。',
    hint: 'section > h2 + 複数のarticle.review の構造です',
    type: 'html',
    starter: '',
    answer: '<section class="reviews">\n  <h2>お客様の声</h2>\n  \n  <article class="review">\n    <div class="review-header">\n      <span class="reviewer">山田花子</span>\n      <span class="rating">★★★★★</span>\n    </div>\n    <p class="review-text">とても良い商品でした！</p>\n    <time datetime="2024-01-10">2024年1月10日</time>\n  </article>\n  \n  <article class="review">\n    <div class="review-header">\n      <span class="reviewer">佐藤太郎</span>\n      <span class="rating">★★★★☆</span>\n    </div>\n    <p class="review-text">コスパが良いです。</p>\n    <time datetime="2024-01-08">2024年1月8日</time>\n  </article>\n</section>',
    requiredElements: ['<section', 'class=', 'review', '<h2>', '</h2>', '<article', '<span', '<p', '<time', 'datetime=']
  }
];

// ==================== CSS問題 36問 ====================
const cssExercises = [
  // ===== 入門（レベル1）6問 =====
  {
    level: 1,
    title: '文字を赤くしよう',
    description: 'colorプロパティの基本を学ぼう',
    task: 'h1要素の文字色を赤（red）にしてください。',
    hint: 'color: 色名; で文字色を指定します',
    type: 'css',
    previewHtml: '<h1>見出しです</h1>',
    starter: 'h1 {\n  \n}',
    answer: 'h1 {\n  color: red;\n}',
    requiredElements: ['h1', 'color', 'red']
  },
  {
    level: 1,
    title: '背景色を変えよう',
    description: 'background-colorプロパティを学ぼう',
    task: 'p要素の背景色を黄色（yellow）にしてください。',
    hint: 'background-color: 色名; で背景色を指定します',
    type: 'css',
    previewHtml: '<p>段落のテキストです</p>',
    starter: 'p {\n  \n}',
    answer: 'p {\n  background-color: yellow;\n}',
    requiredElements: ['p', 'background-color', 'yellow']
  },
  {
    level: 1,
    title: '文字を大きくしよう',
    description: 'font-sizeプロパティを学ぼう',
    task: 'p要素の文字サイズを24pxにしてください。',
    hint: 'font-size: 数値px; でサイズを指定します',
    type: 'css',
    previewHtml: '<p>この文字のサイズが変わります</p>',
    starter: 'p {\n  \n}',
    answer: 'p {\n  font-size: 24px;\n}',
    requiredElements: ['p', 'font-size', '24px']
  },
  {
    level: 1,
    title: '文字を太くしよう',
    description: 'font-weightプロパティを学ぼう',
    task: 'p要素の文字を太字（bold）にしてください。',
    hint: 'font-weight: bold; で太字にできます',
    type: 'css',
    previewHtml: '<p>この文字が太くなります</p>',
    starter: 'p {\n  \n}',
    answer: 'p {\n  font-weight: bold;\n}',
    requiredElements: ['p', 'font-weight', 'bold']
  },
  {
    level: 1,
    title: '中央揃えにしよう',
    description: 'text-alignプロパティを学ぼう',
    task: 'h1要素のテキストを中央揃え（center）にしてください。',
    hint: 'text-align: center; で中央揃えになります',
    type: 'css',
    previewHtml: '<h1>中央に表示</h1>',
    starter: 'h1 {\n  \n}',
    answer: 'h1 {\n  text-align: center;\n}',
    requiredElements: ['h1', 'text-align', 'center']
  },
  {
    level: 1,
    title: '下線を消そう',
    description: 'text-decorationプロパティを学ぼう',
    task: 'a要素の下線を消してください（none）。',
    hint: 'text-decoration: none; で下線を消せます',
    type: 'css',
    previewHtml: '<a href="#">リンクテキスト</a>',
    starter: 'a {\n  \n}',
    answer: 'a {\n  text-decoration: none;\n}',
    requiredElements: ['a', 'text-decoration', 'none']
  },

  // ===== 初級（レベル2）6問 =====
  {
    level: 2,
    title: '内側の余白をつけよう',
    description: 'paddingプロパティを学ぼう',
    task: '.boxクラスに20pxの内側余白（padding）をつけてください。',
    hint: 'padding: 数値px; で内側の余白を指定します',
    type: 'css',
    previewHtml: '<div class="box" style="background:#ddd;border:1px solid #333;">ボックス</div>',
    starter: '.box {\n  \n}',
    answer: '.box {\n  padding: 20px;\n}',
    requiredElements: ['.box', 'padding', '20px']
  },
  {
    level: 2,
    title: '外側の余白をつけよう',
    description: 'marginプロパティを学ぼう',
    task: '.boxクラスに30pxの外側余白（margin）をつけてください。',
    hint: 'margin: 数値px; で外側の余白を指定します',
    type: 'css',
    previewHtml: '<div style="background:#f0f0f0;"><div class="box" style="background:#3498db;color:white;">ボックス</div></div>',
    starter: '.box {\n  \n}',
    answer: '.box {\n  margin: 30px;\n}',
    requiredElements: ['.box', 'margin', '30px']
  },
  {
    level: 2,
    title: '枠線をつけよう',
    description: 'borderプロパティを学ぼう',
    task: '.boxクラスに2pxの実線（solid）で黒（black）の枠線をつけてください。',
    hint: 'border: 太さ スタイル 色; の順で書きます',
    type: 'css',
    previewHtml: '<div class="box" style="padding:10px;">枠線付きボックス</div>',
    starter: '.box {\n  \n}',
    answer: '.box {\n  border: 2px solid black;\n}',
    requiredElements: ['.box', 'border', '2px', 'solid', 'black']
  },
  {
    level: 2,
    title: '角を丸くしよう',
    description: 'border-radiusプロパティを学ぼう',
    task: '.boxクラスの角を10pxの丸みにしてください。',
    hint: 'border-radius: 数値px; で角を丸くできます',
    type: 'css',
    previewHtml: '<div class="box" style="background:#3498db;color:white;padding:20px;">角丸ボックス</div>',
    starter: '.box {\n  \n}',
    answer: '.box {\n  border-radius: 10px;\n}',
    requiredElements: ['.box', 'border-radius', '10px']
  },
  {
    level: 2,
    title: '幅を指定しよう',
    description: 'widthプロパティを学ぼう',
    task: '.boxクラスの幅を200pxにしてください。',
    hint: 'width: 数値px; で幅を指定します',
    type: 'css',
    previewHtml: '<div class="box" style="background:#e74c3c;color:white;padding:10px;">幅200px</div>',
    starter: '.box {\n  \n}',
    answer: '.box {\n  width: 200px;\n}',
    requiredElements: ['.box', 'width', '200px']
  },
  {
    level: 2,
    title: '高さを指定しよう',
    description: 'heightプロパティを学ぼう',
    task: '.boxクラスの高さを100pxにしてください。',
    hint: 'height: 数値px; で高さを指定します',
    type: 'css',
    previewHtml: '<div class="box" style="background:#27ae60;color:white;">高さ100px</div>',
    starter: '.box {\n  \n}',
    answer: '.box {\n  height: 100px;\n}',
    requiredElements: ['.box', 'height', '100px']
  },

  // ===== 中級（レベル3）6問 =====
  {
    level: 3,
    title: 'クラスセレクタで装飾',
    description: '特定のクラスだけにスタイルを適用しよう',
    task: '.highlightクラスに背景色を黄色、文字色を黒にしてください。',
    hint: 'クラスセレクタは .クラス名 で指定します',
    type: 'css',
    previewHtml: '<p>通常のテキスト</p><p class="highlight">ハイライトテキスト</p>',
    starter: '.highlight {\n  \n}',
    answer: '.highlight {\n  background-color: yellow;\n  color: black;\n}',
    requiredElements: ['.highlight', 'background-color', 'yellow', 'color', 'black']
  },
  {
    level: 3,
    title: 'ホバー効果をつけよう',
    description: 'マウスオーバー時のスタイルを学ぼう',
    task: '.btnクラスにホバー時（:hover）背景色を青（blue）にしてください。',
    hint: ':hover擬似クラスを使います',
    type: 'css',
    previewHtml: '<button class="btn" style="padding:10px 20px;background:#ddd;border:none;cursor:pointer;">ホバーしてね</button>',
    starter: '.btn:hover {\n  \n}',
    answer: '.btn:hover {\n  background-color: blue;\n}',
    requiredElements: ['.btn', ':hover', 'background-color', 'blue']
  },
  {
    level: 3,
    title: '16進数カラーを使おう',
    description: '16進数での色指定を学ぼう',
    task: 'h1要素の文字色を #3498db にしてください。',
    hint: '#で始まる6桁の16進数で色を指定できます',
    type: 'css',
    previewHtml: '<h1>カラフル見出し</h1>',
    starter: 'h1 {\n  \n}',
    answer: 'h1 {\n  color: #3498db;\n}',
    requiredElements: ['h1', 'color', '#3498db']
  },
  {
    level: 3,
    title: '行の高さを調整しよう',
    description: 'line-heightプロパティを学ぼう',
    task: 'p要素の行の高さを1.8にしてください。',
    hint: 'line-height: 数値; で行間を調整できます',
    type: 'css',
    previewHtml: '<p>これは複数行にわたる<br>長いテキストです。<br>行間が広がります。</p>',
    starter: 'p {\n  \n}',
    answer: 'p {\n  line-height: 1.8;\n}',
    requiredElements: ['p', 'line-height', '1.8']
  },
  {
    level: 3,
    title: '影をつけよう',
    description: 'box-shadowプロパティを学ぼう',
    task: '.cardクラスに影をつけてください（5px 5px 10px gray）。',
    hint: 'box-shadow: 横 縦 ぼかし 色; の順で書きます',
    type: 'css',
    previewHtml: '<div class="card" style="background:white;padding:20px;width:150px;">カード</div>',
    starter: '.card {\n  \n}',
    answer: '.card {\n  box-shadow: 5px 5px 10px gray;\n}',
    requiredElements: ['.card', 'box-shadow', '5px', '10px', 'gray']
  },
  {
    level: 3,
    title: '透明度を設定しよう',
    description: 'opacityプロパティを学ぼう',
    task: '.fadedクラスの透明度を0.5にしてください。',
    hint: 'opacity: 0から1の値; で透明度を設定します',
    type: 'css',
    previewHtml: '<div class="faded" style="background:#e74c3c;color:white;padding:20px;">半透明</div>',
    starter: '.faded {\n  \n}',
    answer: '.faded {\n  opacity: 0.5;\n}',
    requiredElements: ['.faded', 'opacity', '0.5']
  },

  // ===== 中上級（レベル4）6問 =====
  {
    level: 4,
    title: 'Flexboxで横並び',
    description: 'display: flexの基本を学ぼう',
    task: '.containerクラスにdisplay: flexを設定して、子要素を横並びにしてください。',
    hint: 'display: flex; で子要素が横並びになります',
    type: 'css',
    previewHtml: '<div class="container"><div style="background:#3498db;padding:10px;margin:5px;">1</div><div style="background:#e74c3c;padding:10px;margin:5px;">2</div><div style="background:#27ae60;padding:10px;margin:5px;">3</div></div>',
    starter: '.container {\n  \n}',
    answer: '.container {\n  display: flex;\n}',
    requiredElements: ['.container', 'display', 'flex']
  },
  {
    level: 4,
    title: 'Flexで中央揃え',
    description: 'justify-contentとalign-itemsを学ぼう',
    task: '.containerクラスでFlexboxを使い、justify-content: center と align-items: center で中央揃えにしてください。',
    hint: 'justify-contentは横方向、align-itemsは縦方向の配置です',
    type: 'css',
    previewHtml: '<div class="container" style="height:150px;background:#f0f0f0;"><div style="background:#9b59b6;color:white;padding:20px;">中央</div></div>',
    starter: '.container {\n  display: flex;\n  \n}',
    answer: '.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}',
    requiredElements: ['.container', 'display', 'flex', 'justify-content', 'center', 'align-items']
  },
  {
    level: 4,
    title: 'Flexで均等配置',
    description: 'space-betweenを学ぼう',
    task: '.containerクラスでFlexboxを使い、justify-content: space-between で要素を均等配置してください。',
    hint: 'space-betweenは要素間に均等なスペースを作ります',
    type: 'css',
    previewHtml: '<div class="container" style="background:#f0f0f0;padding:10px;"><div style="background:#3498db;padding:20px;">A</div><div style="background:#e74c3c;padding:20px;">B</div><div style="background:#27ae60;padding:20px;">C</div></div>',
    starter: '.container {\n  display: flex;\n  \n}',
    answer: '.container {\n  display: flex;\n  justify-content: space-between;\n}',
    requiredElements: ['.container', 'display', 'flex', 'justify-content', 'space-between']
  },
  {
    level: 4,
    title: '位置を固定しよう',
    description: 'position: fixedを学ぼう',
    task: '.headerクラスを画面上部に固定（position: fixed、top: 0、left: 0、width: 100%）してください。',
    hint: 'position: fixedでスクロールしても固定されます',
    type: 'css',
    previewHtml: '<div class="header" style="background:#2c3e50;color:white;padding:15px;">固定ヘッダー</div><p style="margin-top:60px;">コンテンツ</p>',
    starter: '.header {\n  \n}',
    answer: '.header {\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n}',
    requiredElements: ['.header', 'position', 'fixed', 'top', '0', 'left', 'width', '100%']
  },
  {
    level: 4,
    title: 'グラデーション背景',
    description: 'linear-gradientを学ぼう',
    task: '.bgクラスにlinear-gradientで左から右へ青(#3498db)から緑(#27ae60)のグラデーションを設定してください。',
    hint: 'background: linear-gradient(方向, 色1, 色2);',
    type: 'css',
    previewHtml: '<div class="bg" style="padding:40px;color:white;text-align:center;">グラデーション</div>',
    starter: '.bg {\n  \n}',
    answer: '.bg {\n  background: linear-gradient(to right, #3498db, #27ae60);\n}',
    requiredElements: ['.bg', 'background', 'linear-gradient', '#3498db', '#27ae60']
  },
  {
    level: 4,
    title: 'トランジションをつけよう',
    description: 'transitionプロパティを学ぼう',
    task: '.btnクラスにtransitionを設定し、0.3秒かけて変化するようにしてください。',
    hint: 'transition: all 0.3s; で全プロパティに適用されます',
    type: 'css',
    previewHtml: '<button class="btn" style="padding:15px 30px;background:#3498db;color:white;border:none;cursor:pointer;">ホバーしてね</button><style>.btn:hover{background:#2980b9;transform:scale(1.1);}</style>',
    starter: '.btn {\n  \n}',
    answer: '.btn {\n  transition: all 0.3s;\n}',
    requiredElements: ['.btn', 'transition', '0.3s']
  },

  // ===== 上級（レベル5）6問 =====
  {
    level: 5,
    title: 'CSS Grid基本',
    description: 'display: gridの基本を学ぼう',
    task: '.gridクラスでCSS Gridを使い、3列（grid-template-columns: repeat(3, 1fr)）にしてください。',
    hint: 'display: gridとgrid-template-columnsを使います',
    type: 'css',
    previewHtml: '<div class="grid"><div style="background:#3498db;padding:20px;">1</div><div style="background:#e74c3c;padding:20px;">2</div><div style="background:#27ae60;padding:20px;">3</div><div style="background:#f39c12;padding:20px;">4</div><div style="background:#9b59b6;padding:20px;">5</div><div style="background:#1abc9c;padding:20px;">6</div></div>',
    starter: '.grid {\n  \n}',
    answer: '.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n}',
    requiredElements: ['.grid', 'display', 'grid', 'grid-template-columns', 'repeat', '3', '1fr']
  },
  {
    level: 5,
    title: 'Gridでギャップ',
    description: 'gapプロパティを学ぼう',
    task: '.gridクラスで3列のGridを作り、要素間に20pxのgapを設定してください。',
    hint: 'gap: 数値px; で要素間の隙間を設定できます',
    type: 'css',
    previewHtml: '<div class="grid"><div style="background:#3498db;padding:20px;">1</div><div style="background:#e74c3c;padding:20px;">2</div><div style="background:#27ae60;padding:20px;">3</div><div style="background:#f39c12;padding:20px;">4</div><div style="background:#9b59b6;padding:20px;">5</div><div style="background:#1abc9c;padding:20px;">6</div></div>',
    starter: '.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  \n}',
    answer: '.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 20px;\n}',
    requiredElements: ['.grid', 'display', 'grid', 'gap', '20px']
  },
  {
    level: 5,
    title: 'メディアクエリ',
    description: 'レスポンシブデザインの基本を学ぼう',
    task: '画面幅が600px以下のとき、.boxクラスの背景色を赤にするメディアクエリを書いてください。',
    hint: '@media (max-width: 600px) { } を使います',
    type: 'css',
    previewHtml: '<div class="box" style="padding:20px;background:#3498db;color:white;">画面幅を変えてみてね（プレビューでは効果が見えません）</div>',
    starter: '',
    answer: '@media (max-width: 600px) {\n  .box {\n    background-color: red;\n  }\n}',
    requiredElements: ['@media', 'max-width', '600px', '.box', 'background-color', 'red']
  },
  {
    level: 5,
    title: 'カスタムプロパティ（CSS変数）',
    description: 'CSS変数を学ぼう',
    task: ':rootで--main-color: #3498db を定義し、.boxクラスでその変数を背景色に使ってください。',
    hint: 'var(--変数名) で変数を使用します',
    type: 'css',
    previewHtml: '<div class="box" style="padding:20px;color:white;">CSS変数使用</div>',
    starter: ':root {\n  \n}\n\n.box {\n  \n}',
    answer: ':root {\n  --main-color: #3498db;\n}\n\n.box {\n  background-color: var(--main-color);\n}',
    requiredElements: [':root', '--main-color', '#3498db', '.box', 'var(--main-color)']
  },
  {
    level: 5,
    title: '疑似要素 ::before',
    description: '::before疑似要素を学ぼう',
    task: '.quoteクラスの前に「"」を追加してください（::beforeとcontent）。',
    hint: '::before { content: "文字"; } で要素の前にコンテンツを追加できます',
    type: 'css',
    previewHtml: '<p class="quote" style="font-size:18px;">これは引用文です</p>',
    starter: '.quote::before {\n  \n}',
    answer: '.quote::before {\n  content: "\\201C";\n}',
    requiredElements: ['.quote', '::before', 'content']
  },
  {
    level: 5,
    title: '完全なカードコンポーネント',
    description: '複数のプロパティを組み合わせてカードを作ろう',
    task: '.cardクラスに背景色白、padding 20px、border-radius 8px、box-shadow（0 2px 8px rgba(0,0,0,0.1)）を設定してください。',
    hint: '複数のプロパティを組み合わせてコンポーネントを作ります',
    type: 'css',
    previewHtml: '<div class="card"><h3>カードタイトル</h3><p>カードの内容がここに入ります。</p></div>',
    starter: '.card {\n  \n}',
    answer: '.card {\n  background-color: white;\n  padding: 20px;\n  border-radius: 8px;\n  box-shadow: 0 2px 8px rgba(0,0,0,0.1);\n}',
    requiredElements: ['.card', 'background-color', 'white', 'padding', '20px', 'border-radius', '8px', 'box-shadow', 'rgba']
  },

  // ===== 実践（レベル6）6問 =====
  {
    level: 6,
    title: 'ボタンコンポーネント',
    description: '実務で使えるボタンスタイルを作ろう',
    task: '.btnクラスにprimary風のボタンスタイルを作成。背景#3498db、文字白、padding 12px 24px、角丸5px、ホバー時に背景を少し暗く（#2980b9）、トランジション0.3秒。',
    hint: 'background, color, padding, border-radius, transition, :hover を組み合わせます',
    type: 'css',
    previewHtml: '<button class="btn">ボタン</button>',
    starter: '.btn {\n  \n}\n\n.btn:hover {\n  \n}',
    answer: '.btn {\n  background-color: #3498db;\n  color: white;\n  padding: 12px 24px;\n  border: none;\n  border-radius: 5px;\n  cursor: pointer;\n  transition: all 0.3s;\n}\n\n.btn:hover {\n  background-color: #2980b9;\n}',
    requiredElements: ['.btn', 'background-color', '#3498db', 'color', 'white', 'padding', 'border-radius', 'transition', ':hover', '#2980b9']
  },
  {
    level: 6,
    title: 'フォーム入力欄スタイル',
    description: '見やすいフォーム入力欄を作ろう',
    task: '.form-inputクラスに、幅100%、padding 12px、枠線1px solid #ddd、角丸4px、フォーカス時に枠線を#3498dbに変更するスタイルを作成。',
    hint: 'width, padding, border, border-radius, :focus, outline を使います',
    type: 'css',
    previewHtml: '<input type="text" class="form-input" placeholder="入力してください">',
    starter: '.form-input {\n  \n}\n\n.form-input:focus {\n  \n}',
    answer: '.form-input {\n  width: 100%;\n  padding: 12px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 16px;\n  box-sizing: border-box;\n}\n\n.form-input:focus {\n  outline: none;\n  border-color: #3498db;\n}',
    requiredElements: ['.form-input', 'width', '100%', 'padding', 'border', 'border-radius', ':focus', 'border-color', '#3498db']
  },
  {
    level: 6,
    title: 'ナビゲーションバー',
    description: 'ヘッダーナビゲーションのスタイルを作ろう',
    task: '.navbarクラスでFlexboxを使い、ロゴとメニューをspace-between配置、背景#2c3e50、padding 15px 30px。メニューリンクは白文字でホバー時に#e94560。',
    hint: 'display: flex, justify-content, background, color, :hover を組み合わせます',
    type: 'css',
    previewHtml: '<nav class="navbar"><div class="logo">Logo</div><div class="nav-links"><a href="#">Home</a><a href="#">About</a><a href="#">Contact</a></div></nav>',
    starter: '.navbar {\n  \n}\n\n.navbar .logo {\n  color: white;\n  font-weight: bold;\n}\n\n.navbar a {\n  \n}\n\n.navbar a:hover {\n  \n}',
    answer: '.navbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  background-color: #2c3e50;\n  padding: 15px 30px;\n}\n\n.navbar .logo {\n  color: white;\n  font-weight: bold;\n}\n\n.navbar a {\n  color: white;\n  text-decoration: none;\n  margin-left: 20px;\n}\n\n.navbar a:hover {\n  color: #e94560;\n}',
    requiredElements: ['.navbar', 'display', 'flex', 'justify-content', 'space-between', 'background-color', '#2c3e50', 'color', 'white', ':hover', '#e94560']
  },
  {
    level: 6,
    title: '商品カードスタイル',
    description: 'ECサイト風の商品カードを作ろう',
    task: '.product-cardクラスに背景白、角丸10px、影(0 4px 15px rgba(0,0,0,0.1))、overflow hidden。画像は幅100%、価格は赤太字、ボタンは幅100%で背景#27ae60。',
    hint: 'background, border-radius, box-shadow, overflow, width を組み合わせます',
    type: 'css',
    previewHtml: '<div class="product-card"><img src="https://via.placeholder.com/200x150" alt="商品"><div class="product-info"><h3>商品名</h3><p class="price">¥1,980</p><button class="buy-btn">購入する</button></div></div>',
    starter: '.product-card {\n  \n}\n\n.product-card img {\n  \n}\n\n.product-info {\n  padding: 15px;\n}\n\n.price {\n  \n}\n\n.buy-btn {\n  \n}',
    answer: '.product-card {\n  background: white;\n  border-radius: 10px;\n  box-shadow: 0 4px 15px rgba(0,0,0,0.1);\n  overflow: hidden;\n  width: 250px;\n}\n\n.product-card img {\n  width: 100%;\n}\n\n.product-info {\n  padding: 15px;\n}\n\n.price {\n  color: #e74c3c;\n  font-weight: bold;\n  font-size: 1.2rem;\n}\n\n.buy-btn {\n  width: 100%;\n  background-color: #27ae60;\n  color: white;\n  border: none;\n  padding: 10px;\n  cursor: pointer;\n}',
    requiredElements: ['.product-card', 'background', 'border-radius', 'box-shadow', 'rgba', 'overflow', 'width', '100%', '.price', 'color', '#e74c3c', 'font-weight', 'bold', '.buy-btn', '#27ae60']
  },
  {
    level: 6,
    title: 'ヒーローセクション',
    description: 'ランディングページのヒーローセクションを作ろう',
    task: '.heroクラスに高さ80vh、背景画像(背景色#1a1a2eで代用)、Flexboxで中央配置。見出しは白で大きく(3rem)、サブテキストは薄いグレー。',
    hint: 'height: 80vh, display: flex, flex-direction: column, justify-content, align-items, text-align を使います',
    type: 'css',
    previewHtml: '<section class="hero"><h1>Welcome to Our Site</h1><p>素晴らしい体験をお届けします</p></section>',
    starter: '.hero {\n  \n}\n\n.hero h1 {\n  \n}\n\n.hero p {\n  \n}',
    answer: '.hero {\n  height: 80vh;\n  background-color: #1a1a2e;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  text-align: center;\n}\n\n.hero h1 {\n  color: white;\n  font-size: 3rem;\n  margin-bottom: 1rem;\n}\n\n.hero p {\n  color: #a0a0a0;\n  font-size: 1.2rem;\n}',
    requiredElements: ['.hero', 'height', '80vh', 'display', 'flex', 'flex-direction', 'column', 'justify-content', 'center', 'align-items', 'h1', 'color', 'white', 'font-size', '3rem']
  },
  {
    level: 6,
    title: '料金プランカード',
    description: 'SaaS風の料金プランカードを作ろう',
    task: '.pricing-cardクラスにテキスト中央、背景白、padding 30px、角丸15px、影。価格(.price)は大きく青(#3498db)、おすすめ(.featured)は背景を青、文字を白に。',
    hint: 'text-align, background, padding, border-radius, box-shadow, font-size, color を組み合わせます',
    type: 'css',
    previewHtml: '<div class="pricing-card"><h3>Basic</h3><p class="price">¥980<span>/月</span></p><ul><li>機能A</li><li>機能B</li></ul><button>申し込む</button></div>',
    starter: '.pricing-card {\n  \n}\n\n.pricing-card .price {\n  \n}\n\n.pricing-card.featured {\n  \n}',
    answer: '.pricing-card {\n  text-align: center;\n  background: white;\n  padding: 30px;\n  border-radius: 15px;\n  box-shadow: 0 5px 20px rgba(0,0,0,0.1);\n}\n\n.pricing-card .price {\n  font-size: 2.5rem;\n  color: #3498db;\n  font-weight: bold;\n}\n\n.pricing-card.featured {\n  background: #3498db;\n  color: white;\n}',
    requiredElements: ['.pricing-card', 'text-align', 'center', 'background', 'padding', 'border-radius', 'box-shadow', '.price', 'font-size', 'color', '#3498db', '.featured']
  }
];

// ==================== レイアウト問題 20問 ====================
const layoutExercises = [
  // ===== 入門（レベル1）4問 =====
  {
    level: 1,
    title: '要素を横並びにしよう',
    description: 'Flexboxで要素を横に並べる基本',
    task: '.containerクラスにdisplay: flexを設定して、3つのボックスを横並びにしてください。',
    hint: 'display: flex; を使うと子要素が横並びになります',
    type: 'css',
    previewHtml: '<div class="container"><div class="box">1</div><div class="box">2</div><div class="box">3</div></div><style>.box{background:#3498db;color:white;padding:20px;margin:5px;}</style>',
    starter: '.container {\n  \n}',
    answer: '.container {\n  display: flex;\n}',
    requiredElements: ['.container', 'display', 'flex']
  },
  {
    level: 1,
    title: '中央揃えの基本',
    description: 'Flexboxで中央揃えを学ぼう',
    task: '.containerクラスでFlexboxを使い、中の要素を水平方向の中央に配置してください。',
    hint: 'justify-content: center; で水平方向の中央揃えができます',
    type: 'css',
    previewHtml: '<div class="container" style="background:#f0f0f0;padding:20px;"><div style="background:#e74c3c;color:white;padding:20px;">中央</div></div>',
    starter: '.container {\n  display: flex;\n  \n}',
    answer: '.container {\n  display: flex;\n  justify-content: center;\n}',
    requiredElements: ['.container', 'display', 'flex', 'justify-content', 'center']
  },
  {
    level: 1,
    title: '縦方向の中央揃え',
    description: 'align-itemsを学ぼう',
    task: '.containerクラス（高さ200px）で、中の要素を垂直方向の中央に配置してください。',
    hint: 'align-items: center; で垂直方向の中央揃えができます',
    type: 'css',
    previewHtml: '<div class="container" style="background:#f0f0f0;height:200px;"><div style="background:#27ae60;color:white;padding:20px;">中央</div></div>',
    starter: '.container {\n  display: flex;\n  \n}',
    answer: '.container {\n  display: flex;\n  align-items: center;\n}',
    requiredElements: ['.container', 'display', 'flex', 'align-items', 'center']
  },
  {
    level: 1,
    title: '完全な中央配置',
    description: '上下左右の中央揃えを実現しよう',
    task: '.containerクラス（高さ200px）で、中の要素を上下左右の中央に配置してください。',
    hint: 'justify-contentとalign-itemsの両方をcenterにします',
    type: 'css',
    previewHtml: '<div class="container" style="background:#f0f0f0;height:200px;"><div style="background:#9b59b6;color:white;padding:20px;">中央</div></div>',
    starter: '.container {\n  display: flex;\n  \n}',
    answer: '.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}',
    requiredElements: ['.container', 'display', 'flex', 'justify-content', 'center', 'align-items']
  },

  // ===== 初級（レベル2）4問 =====
  {
    level: 2,
    title: '均等配置',
    description: 'space-betweenを使おう',
    task: '.navクラスでFlexboxを使い、メニュー項目を両端揃えで均等に配置してください。',
    hint: 'justify-content: space-between; で両端揃えの均等配置ができます',
    type: 'css',
    previewHtml: '<nav class="nav" style="background:#2c3e50;padding:15px;"><a style="color:white;">ホーム</a><a style="color:white;">概要</a><a style="color:white;">お問い合わせ</a></nav>',
    starter: '.nav {\n  display: flex;\n  \n}',
    answer: '.nav {\n  display: flex;\n  justify-content: space-between;\n}',
    requiredElements: ['.nav', 'display', 'flex', 'justify-content', 'space-between']
  },
  {
    level: 2,
    title: '要素間のスペース',
    description: 'gapプロパティを使おう',
    task: '.containerクラスでFlexboxを使い、要素間に20pxのスペースを設定してください。',
    hint: 'gap: 数値px; で要素間のスペースを設定できます',
    type: 'css',
    previewHtml: '<div class="container"><div style="background:#3498db;color:white;padding:20px;">A</div><div style="background:#e74c3c;color:white;padding:20px;">B</div><div style="background:#27ae60;color:white;padding:20px;">C</div></div>',
    starter: '.container {\n  display: flex;\n  \n}',
    answer: '.container {\n  display: flex;\n  gap: 20px;\n}',
    requiredElements: ['.container', 'display', 'flex', 'gap', '20px']
  },
  {
    level: 2,
    title: '縦並びに変更',
    description: 'flex-directionを学ぼう',
    task: '.containerクラスでFlexboxを使い、要素を縦並び（列方向）に配置してください。',
    hint: 'flex-direction: column; で縦並びになります',
    type: 'css',
    previewHtml: '<div class="container"><div style="background:#3498db;color:white;padding:10px;margin:2px;">1</div><div style="background:#e74c3c;color:white;padding:10px;margin:2px;">2</div><div style="background:#27ae60;color:white;padding:10px;margin:2px;">3</div></div>',
    starter: '.container {\n  display: flex;\n  \n}',
    answer: '.container {\n  display: flex;\n  flex-direction: column;\n}',
    requiredElements: ['.container', 'display', 'flex', 'flex-direction', 'column']
  },
  {
    level: 2,
    title: '折り返しレイアウト',
    description: 'flex-wrapを学ぼう',
    task: '.containerクラスでFlexboxを使い、要素が収まりきらない場合に折り返すようにしてください。',
    hint: 'flex-wrap: wrap; で折り返しが有効になります',
    type: 'css',
    previewHtml: '<div class="container" style="width:250px;background:#f0f0f0;"><div style="background:#3498db;color:white;padding:20px;margin:5px;width:100px;">1</div><div style="background:#e74c3c;color:white;padding:20px;margin:5px;width:100px;">2</div><div style="background:#27ae60;color:white;padding:20px;margin:5px;width:100px;">3</div></div>',
    starter: '.container {\n  display: flex;\n  \n}',
    answer: '.container {\n  display: flex;\n  flex-wrap: wrap;\n}',
    requiredElements: ['.container', 'display', 'flex', 'flex-wrap', 'wrap']
  },

  // ===== 中級（レベル3）4問 =====
  {
    level: 3,
    title: 'シンプルなヘッダー',
    description: 'ロゴとナビを両端に配置しよう',
    task: '.headerクラスでFlexboxを使い、ロゴを左、ナビを右に配置してください。また、縦方向は中央揃えにしてください。',
    hint: 'justify-content: space-between; とalign-items: center; を組み合わせます',
    type: 'css',
    previewHtml: '<header class="header" style="background:#2c3e50;padding:15px;"><div class="logo" style="color:#e94560;font-weight:bold;">Logo</div><nav style="color:white;">Menu</nav></header>',
    starter: '.header {\n  display: flex;\n  \n}',
    answer: '.header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}',
    requiredElements: ['.header', 'display', 'flex', 'justify-content', 'space-between', 'align-items', 'center']
  },
  {
    level: 3,
    title: '3列グリッド',
    description: 'CSS Gridで3列レイアウトを作ろう',
    task: '.gridクラスでCSS Gridを使い、3列の等幅レイアウトを作成してください。',
    hint: 'grid-template-columns: repeat(3, 1fr); で3列の等幅になります',
    type: 'css',
    previewHtml: '<div class="grid"><div style="background:#3498db;padding:20px;">1</div><div style="background:#e74c3c;padding:20px;">2</div><div style="background:#27ae60;padding:20px;">3</div><div style="background:#f39c12;padding:20px;">4</div><div style="background:#9b59b6;padding:20px;">5</div><div style="background:#1abc9c;padding:20px;">6</div></div>',
    starter: '.grid {\n  display: grid;\n  \n}',
    answer: '.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n}',
    requiredElements: ['.grid', 'display', 'grid', 'grid-template-columns', 'repeat', '3', '1fr']
  },
  {
    level: 3,
    title: 'カードグリッド',
    description: 'Gridでカードレイアウトを作ろう',
    task: '.card-gridクラスで3列のグリッドを作り、要素間に15pxのgapを設定してください。',
    hint: 'gapプロパティでグリッドアイテム間のスペースを設定できます',
    type: 'css',
    previewHtml: '<div class="card-grid"><div style="background:white;padding:15px;box-shadow:0 2px 5px rgba(0,0,0,0.1);">Card 1</div><div style="background:white;padding:15px;box-shadow:0 2px 5px rgba(0,0,0,0.1);">Card 2</div><div style="background:white;padding:15px;box-shadow:0 2px 5px rgba(0,0,0,0.1);">Card 3</div></div>',
    starter: '.card-grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  \n}',
    answer: '.card-grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 15px;\n}',
    requiredElements: ['.card-grid', 'display', 'grid', 'gap', '15px']
  },
  {
    level: 3,
    title: 'サイドバーレイアウト',
    description: '固定幅サイドバー＋メインコンテンツ',
    task: '.layoutクラスでGridを使い、左に250pxの固定幅サイドバー、右に可変幅のメインエリアを作ってください。',
    hint: 'grid-template-columns: 250px 1fr; で固定＋可変の組み合わせができます',
    type: 'css',
    previewHtml: '<div class="layout" style="min-height:150px;"><aside style="background:#2c3e50;color:white;padding:15px;">Sidebar</aside><main style="background:#ecf0f1;padding:15px;">Main Content</main></div>',
    starter: '.layout {\n  display: grid;\n  \n}',
    answer: '.layout {\n  display: grid;\n  grid-template-columns: 250px 1fr;\n}',
    requiredElements: ['.layout', 'display', 'grid', 'grid-template-columns', '250px', '1fr']
  },

  // ===== 中上級（レベル4）4問 =====
  {
    level: 4,
    title: 'ホーリーグレイルレイアウト',
    description: 'ヘッダー・フッター＋3列レイアウト',
    task: '.pageクラスでGridを使い、ヘッダー(上)、フッター(下)、左サイドバー(200px)、メイン(1fr)、右サイドバー(150px)のレイアウトを作ってください。',
    hint: 'grid-template-areasを使うと複雑なレイアウトが簡単に作れます',
    type: 'css',
    previewHtml: '<div class="page" style="min-height:250px;"><header style="background:#2c3e50;color:white;padding:10px;">Header</header><aside class="left" style="background:#3498db;color:white;padding:10px;">Left</aside><main style="background:#ecf0f1;padding:10px;">Main</main><aside class="right" style="background:#e74c3c;color:white;padding:10px;">Right</aside><footer style="background:#2c3e50;color:white;padding:10px;">Footer</footer></div>',
    starter: '.page {\n  display: grid;\n  grid-template-columns: 200px 1fr 150px;\n  grid-template-rows: auto 1fr auto;\n  \n}\n\n.page header { grid-column: 1 / -1; }\n.page footer { grid-column: 1 / -1; }',
    answer: '.page {\n  display: grid;\n  grid-template-columns: 200px 1fr 150px;\n  grid-template-rows: auto 1fr auto;\n  min-height: 200px;\n}\n\n.page header { grid-column: 1 / -1; }\n.page footer { grid-column: 1 / -1; }',
    requiredElements: ['.page', 'display', 'grid', 'grid-template-columns', 'grid-template-rows']
  },
  {
    level: 4,
    title: 'スティッキーフッター',
    description: 'フッターを常に画面下部に配置',
    task: '.wrapperクラスでFlexboxを使い、コンテンツが少なくてもフッターが画面下部に固定されるレイアウトを作ってください。min-height: 100vhを使います。',
    hint: 'flex-direction: columnとmargin-top: autoの組み合わせが有効です',
    type: 'css',
    previewHtml: '<div class="wrapper"><header style="background:#2c3e50;color:white;padding:15px;">Header</header><main style="background:#ecf0f1;padding:15px;">Main Content</main><footer style="background:#2c3e50;color:white;padding:15px;">Footer</footer></div>',
    starter: '.wrapper {\n  display: flex;\n  flex-direction: column;\n  min-height: 100vh;\n}\n\n.wrapper footer {\n  \n}',
    answer: '.wrapper {\n  display: flex;\n  flex-direction: column;\n  min-height: 100vh;\n}\n\n.wrapper footer {\n  margin-top: auto;\n}',
    requiredElements: ['.wrapper', 'display', 'flex', 'flex-direction', 'column', 'margin-top', 'auto']
  },
  {
    level: 4,
    title: 'レスポンシブナビ',
    description: 'メディアクエリでナビを変化させよう',
    task: '.navクラスのナビゲーションを、768px以下では縦並びに変更するメディアクエリを書いてください。',
    hint: '@media (max-width: 768px) { } 内でflex-directionを変更します',
    type: 'css',
    previewHtml: '<nav class="nav" style="background:#2c3e50;padding:10px;"><a style="color:white;padding:10px;">Home</a><a style="color:white;padding:10px;">About</a><a style="color:white;padding:10px;">Contact</a></nav>',
    starter: '.nav {\n  display: flex;\n  gap: 10px;\n}\n\n@media (max-width: 768px) {\n  .nav {\n    \n  }\n}',
    answer: '.nav {\n  display: flex;\n  gap: 10px;\n}\n\n@media (max-width: 768px) {\n  .nav {\n    flex-direction: column;\n  }\n}',
    requiredElements: ['@media', 'max-width', '768px', 'flex-direction', 'column']
  },
  {
    level: 4,
    title: 'レスポンシブグリッド',
    description: '画面幅に応じて列数を変更しよう',
    task: '.gridクラスで、auto-fitとminmax()を使い、最小200px〜最大1frの自動調整グリッドを作ってください。',
    hint: 'repeat(auto-fit, minmax(200px, 1fr)) で自動調整できます',
    type: 'css',
    previewHtml: '<div class="grid"><div style="background:#3498db;padding:30px;">1</div><div style="background:#e74c3c;padding:30px;">2</div><div style="background:#27ae60;padding:30px;">3</div><div style="background:#f39c12;padding:30px;">4</div></div>',
    starter: '.grid {\n  display: grid;\n  gap: 15px;\n  \n}',
    answer: '.grid {\n  display: grid;\n  gap: 15px;\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n}',
    requiredElements: ['.grid', 'display', 'grid', 'grid-template-columns', 'repeat', 'auto-fit', 'minmax', '200px', '1fr']
  },

  // ===== 上級（レベル5）4問 =====
  {
    level: 5,
    title: 'ダッシュボードレイアウト',
    description: '固定サイドバー＋スクロールメイン',
    task: '.dashboardクラスで、左に固定幅250pxのサイドバー、右にスクロール可能なメインエリアを持つダッシュボードを作ってください。高さは100vhで固定。',
    hint: 'overflow: auto; でスクロール可能になります',
    type: 'css',
    previewHtml: '<div class="dashboard"><aside style="background:#1a1a2e;color:white;padding:20px;">Sidebar<br>Menu1<br>Menu2</aside><main style="background:#f5f5f5;padding:20px;">Dashboard Content<br>...<br>...<br>...</main></div>',
    starter: '.dashboard {\n  display: grid;\n  grid-template-columns: 250px 1fr;\n  height: 100vh;\n}\n\n.dashboard main {\n  \n}',
    answer: '.dashboard {\n  display: grid;\n  grid-template-columns: 250px 1fr;\n  height: 100vh;\n}\n\n.dashboard main {\n  overflow: auto;\n}',
    requiredElements: ['.dashboard', 'display', 'grid', 'height', '100vh', 'overflow', 'auto']
  },
  {
    level: 5,
    title: 'マガジンレイアウト',
    description: '異なるサイズのグリッドアイテムを配置',
    task: '.magazineクラスで3列グリッドを作り、最初のアイテム(.feature)を2列×2行に拡張してください。',
    hint: 'grid-columnとgrid-rowでアイテムのサイズを指定できます',
    type: 'css',
    previewHtml: '<div class="magazine"><div class="feature" style="background:#e74c3c;color:white;padding:20px;">Featured</div><div style="background:#3498db;padding:20px;">2</div><div style="background:#27ae60;padding:20px;">3</div><div style="background:#f39c12;padding:20px;">4</div><div style="background:#9b59b6;padding:20px;">5</div></div>',
    starter: '.magazine {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 10px;\n}\n\n.feature {\n  \n}',
    answer: '.magazine {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 10px;\n}\n\n.feature {\n  grid-column: span 2;\n  grid-row: span 2;\n}',
    requiredElements: ['.magazine', '.feature', 'grid-column', 'span', 'grid-row']
  },
  {
    level: 5,
    title: '固定ヘッダー＋スクロール',
    description: '固定ヘッダーとコンテンツの共存',
    task: '.containerクラスで、上部に60px固定のヘッダー、残りがスクロール可能なレイアウトを作ってください。',
    hint: 'grid-template-rows: 60px 1fr; でヘッダー高さを固定できます',
    type: 'css',
    previewHtml: '<div class="container" style="height:200px;"><header style="background:#2c3e50;color:white;padding:15px;">Fixed Header</header><main style="background:#ecf0f1;padding:15px;">Scrollable Content<br>Line 2<br>Line 3<br>Line 4<br>Line 5</main></div>',
    starter: '.container {\n  display: grid;\n  height: 100vh;\n  \n}\n\n.container main {\n  overflow: auto;\n}',
    answer: '.container {\n  display: grid;\n  height: 100vh;\n  grid-template-rows: 60px 1fr;\n}\n\n.container main {\n  overflow: auto;\n}',
    requiredElements: ['.container', 'display', 'grid', 'grid-template-rows', '60px', '1fr']
  },
  {
    level: 5,
    title: '完全なページレイアウト',
    description: 'ヘッダー・ナビ・サイド・メイン・フッターの複合レイアウト',
    task: '.pageクラスでgrid-template-areasを使い、「header header」「nav main」「footer footer」の構成を作ってください。左列は200px固定。',
    hint: 'grid-template-areasで領域名を定義し、各要素にgrid-areaで割り当てます',
    type: 'css',
    previewHtml: '<div class="page" style="min-height:200px;"><header style="background:#2c3e50;color:white;padding:10px;">Header</header><nav style="background:#34495e;color:white;padding:10px;">Nav</nav><main style="background:#ecf0f1;padding:10px;">Main</main><footer style="background:#2c3e50;color:white;padding:10px;">Footer</footer></div>',
    starter: '.page {\n  display: grid;\n  grid-template-columns: 200px 1fr;\n  \n}\n\n.page header { grid-area: header; }\n.page nav { grid-area: nav; }\n.page main { grid-area: main; }\n.page footer { grid-area: footer; }',
    answer: '.page {\n  display: grid;\n  grid-template-columns: 200px 1fr;\n  grid-template-areas:\n    "header header"\n    "nav main"\n    "footer footer";\n}\n\n.page header { grid-area: header; }\n.page nav { grid-area: nav; }\n.page main { grid-area: main; }\n.page footer { grid-area: footer; }',
    requiredElements: ['.page', 'display', 'grid', 'grid-template-areas', 'header', 'nav', 'main', 'footer']
  }
];

// ==================== JavaScript問題 20問 ====================
const jsExercises = [
  // ===== 入門（レベル1）4問 =====
  {
    level: 1,
    title: 'はじめての出力',
    description: 'console.logで文字を出力しよう',
    task: 'console.logを使って「Hello JavaScript」と出力してください。',
    hint: 'console.log("文字列"); で出力できます',
    type: 'javascript',
    starter: '',
    placeholder: 'console.log("ここに文字");',
    answer: 'console.log("Hello JavaScript");',
    requiredElements: ['console.log', 'hello javascript']
  },
  {
    level: 1,
    title: '変数を使おう（let）',
    description: 'letで変数を宣言しよう',
    task: 'letでnameという変数を宣言し、「太郎」を代入してからconsole.logで出力してください。',
    hint: 'let 変数名 = 値; で宣言と代入ができます',
    type: 'javascript',
    starter: '',
    placeholder: 'let name = "値";\nconsole.log(name);',
    answer: 'let name = "太郎";\nconsole.log(name);',
    requiredElements: ['let', 'name', '太郎', 'console.log']
  },
  {
    level: 1,
    title: '定数を使おう（const）',
    description: 'constで定数を宣言しよう',
    task: 'constでPIという定数を宣言し、3.14を代入してからconsole.logで出力してください。',
    hint: 'constは再代入できない定数を宣言します',
    type: 'javascript',
    starter: '',
    placeholder: 'const PI = 値;\nconsole.log(PI);',
    answer: 'const PI = 3.14;\nconsole.log(PI);',
    requiredElements: ['const', 'pi', '3.14', 'console.log']
  },
  {
    level: 1,
    title: '数値の計算',
    description: '基本的な計算をしてみよう',
    task: '10 + 5 の計算結果をconsole.logで出力してください。',
    hint: '+で足し算、-で引き算、*で掛け算、/で割り算ができます',
    type: 'javascript',
    starter: '',
    placeholder: 'console.log(計算式);',
    answer: 'console.log(10 + 5);',
    requiredElements: ['console.log', '10', '+', '5']
  },

  // ===== 初級（レベル2）4問 =====
  {
    level: 2,
    title: '文字列の連結',
    description: '文字列をつなげよう',
    task: '「こんにちは」と「世界」を+でつなげて出力してください。',
    hint: '文字列同士も+でつなげられます',
    type: 'javascript',
    starter: '',
    answer: 'console.log("こんにちは" + "世界");',
    requiredElements: ['console.log', 'こんにちは', '+', '世界']
  },
  {
    level: 2,
    title: 'テンプレートリテラル',
    description: 'バッククォートで文字列を作ろう',
    task: 'nameに「太郎」を代入し、テンプレートリテラルで「私は太郎です」と出力してください。',
    hint: '`私は${name}です` のようにバッククォートと${}を使います',
    type: 'javascript',
    starter: 'const name = "太郎";',
    answer: 'const name = "太郎";\nconsole.log(`私は${name}です`);',
    requiredElements: ['const', 'name', '太郎', '${', '}', 'console.log']
  },
  {
    level: 2,
    title: '条件分岐（if）',
    description: 'if文で条件判定しよう',
    task: 'scoreが80以上なら「合格」、それ以外は「不合格」と出力してください。scoreは85です。',
    hint: 'if (条件) { } else { } の形式で書きます',
    type: 'javascript',
    starter: 'const score = 85;',
    answer: 'const score = 85;\nif (score >= 80) {\n  console.log("合格");\n} else {\n  console.log("不合格");\n}',
    requiredElements: ['const', 'score', 'if', '>=', '80', 'else', 'console.log']
  },
  {
    level: 2,
    title: '配列の基本',
    description: '配列を作って要素を取得しよう',
    task: 'fruitsという配列に「りんご」「みかん」「ぶどう」を入れ、2番目の要素（みかん）を出力してください。',
    hint: '配列のインデックスは0から始まります。fruits[1]が2番目です',
    type: 'javascript',
    starter: '',
    answer: 'const fruits = ["りんご", "みかん", "ぶどう"];\nconsole.log(fruits[1]);',
    requiredElements: ['const', 'fruits', '[', ']', 'りんご', 'みかん', 'ぶどう', 'console.log', '[1]']
  },

  // ===== 中級（レベル3）4問 =====
  {
    level: 3,
    title: '関数を作ろう',
    description: '関数の宣言と呼び出し',
    task: 'greet関数を作り、「こんにちは！」と出力してください。関数を呼び出すのを忘れずに。',
    hint: 'function 関数名() { } で関数を作り、関数名() で呼び出します',
    type: 'javascript',
    starter: '',
    answer: 'function greet() {\n  console.log("こんにちは！");\n}\ngreet();',
    requiredElements: ['function', 'greet', 'console.log', 'こんにちは', 'greet()']
  },
  {
    level: 3,
    title: '引数と戻り値',
    description: '引数を受け取って結果を返す関数',
    task: 'add関数を作り、2つの数値を受け取って合計を返してください。add(3, 5)を出力すると8になるように。',
    hint: 'return で値を返します。function add(a, b) { return a + b; }',
    type: 'javascript',
    starter: '',
    answer: 'function add(a, b) {\n  return a + b;\n}\nconsole.log(add(3, 5));',
    requiredElements: ['function', 'add', 'return', '+', 'console.log', 'add(3, 5)']
  },
  {
    level: 3,
    title: 'アロー関数',
    description: '短い構文で関数を書こう',
    task: 'multiplyという名前のアロー関数を作り、2つの数値を掛け算して返してください。multiply(4, 3)を出力。',
    hint: 'const 関数名 = (引数) => 戻り値; の形式です',
    type: 'javascript',
    starter: '',
    answer: 'const multiply = (a, b) => a * b;\nconsole.log(multiply(4, 3));',
    requiredElements: ['const', 'multiply', '=>', '*', 'console.log']
  },
  {
    level: 3,
    title: 'オブジェクトの基本',
    description: 'オブジェクトを作ってプロパティにアクセス',
    task: 'personオブジェクトを作り、nameに「太郎」、ageに25を設定。person.nameを出力してください。',
    hint: 'const person = { name: "太郎", age: 25 }; のように書きます',
    type: 'javascript',
    starter: '',
    answer: 'const person = {\n  name: "太郎",\n  age: 25\n};\nconsole.log(person.name);',
    requiredElements: ['const', 'person', '{', '}', 'name', '太郎', 'age', '25', 'console.log', 'person.name']
  },

  // ===== 中上級（レベル4）4問 =====
  {
    level: 4,
    title: 'for文でループ',
    description: 'for文で繰り返し処理をしよう',
    task: 'for文を使って1から5までの数字を順番に出力してください。',
    hint: 'for (let i = 1; i <= 5; i++) { } の形式です',
    type: 'javascript',
    starter: '',
    answer: 'for (let i = 1; i <= 5; i++) {\n  console.log(i);\n}',
    requiredElements: ['for', 'let', 'i', '<=', '5', 'i++', 'console.log']
  },
  {
    level: 4,
    title: '配列のforEach',
    description: 'forEachで配列の要素を処理しよう',
    task: 'colorsに「赤」「青」「緑」を入れ、forEachで全要素を出力してください。',
    hint: 'colors.forEach(color => console.log(color)); の形式です',
    type: 'javascript',
    starter: 'const colors = ["赤", "青", "緑"];',
    answer: 'const colors = ["赤", "青", "緑"];\ncolors.forEach(color => {\n  console.log(color);\n});',
    requiredElements: ['const', 'colors', 'foreach', '=>', 'console.log']
  },
  {
    level: 4,
    title: '配列のmap',
    description: 'mapで配列を変換しよう',
    task: 'numbersに[1, 2, 3]を入れ、mapで各要素を2倍にした新しい配列doubledを作って出力してください。',
    hint: 'const doubled = numbers.map(n => n * 2); のように使います',
    type: 'javascript',
    starter: 'const numbers = [1, 2, 3];',
    answer: 'const numbers = [1, 2, 3];\nconst doubled = numbers.map(n => n * 2);\nconsole.log(doubled);',
    requiredElements: ['const', 'numbers', 'map', '=>', '*', '2', 'doubled', 'console.log']
  },
  {
    level: 4,
    title: '配列のfilter',
    description: 'filterで条件に合う要素を抽出しよう',
    task: 'scoresに[85, 60, 92, 45, 78]を入れ、filterで70以上の要素だけを抽出したpassedを作って出力してください。',
    hint: 'const passed = scores.filter(s => s >= 70); のように使います',
    type: 'javascript',
    starter: 'const scores = [85, 60, 92, 45, 78];',
    answer: 'const scores = [85, 60, 92, 45, 78];\nconst passed = scores.filter(s => s >= 70);\nconsole.log(passed);',
    requiredElements: ['const', 'scores', 'filter', '=>', '>=', '70', 'passed', 'console.log']
  },

  // ===== 上級（レベル5）4問 =====
  {
    level: 5,
    title: '配列のreduce',
    description: 'reduceで配列を集計しよう',
    task: 'numbersに[1, 2, 3, 4, 5]を入れ、reduceで合計値を計算して出力してください。',
    hint: 'numbers.reduce((acc, curr) => acc + curr, 0) で合計が求められます',
    type: 'javascript',
    starter: 'const numbers = [1, 2, 3, 4, 5];',
    answer: 'const numbers = [1, 2, 3, 4, 5];\nconst sum = numbers.reduce((acc, curr) => acc + curr, 0);\nconsole.log(sum);',
    requiredElements: ['const', 'numbers', 'reduce', '=>', '+', 'console.log']
  },
  {
    level: 5,
    title: '分割代入',
    description: 'オブジェクトと配列の分割代入を使おう',
    task: 'personオブジェクト{name: "花子", age: 30}からnameとageを分割代入で取り出し、両方を出力してください。',
    hint: 'const { name, age } = person; で取り出せます',
    type: 'javascript',
    starter: 'const person = { name: "花子", age: 30 };',
    answer: 'const person = { name: "花子", age: 30 };\nconst { name, age } = person;\nconsole.log(name);\nconsole.log(age);',
    requiredElements: ['const', 'person', '{', 'name', 'age', '}', '=', 'console.log']
  },
  {
    level: 5,
    title: 'スプレッド構文',
    description: 'スプレッド構文で配列を操作しよう',
    task: 'arr1に[1, 2]、arr2に[3, 4]を入れ、スプレッド構文で結合したcombinedを作って出力してください。',
    hint: 'const combined = [...arr1, ...arr2]; で結合できます',
    type: 'javascript',
    starter: 'const arr1 = [1, 2];\nconst arr2 = [3, 4];',
    answer: 'const arr1 = [1, 2];\nconst arr2 = [3, 4];\nconst combined = [...arr1, ...arr2];\nconsole.log(combined);',
    requiredElements: ['const', 'arr1', 'arr2', '...', 'combined', 'console.log']
  },
  {
    level: 5,
    title: 'クラスの基本',
    description: 'クラスを定義してインスタンスを作ろう',
    task: 'Animalクラスを作り、constructorでnameを受け取り、speak()メソッドで「{name}が鳴いています」と出力してください。new Animal("犬")でインスタンスを作り、speak()を呼び出す。',
    hint: 'class Animal { constructor(name) { this.name = name; } speak() { ... } }',
    type: 'javascript',
    starter: '',
    answer: 'class Animal {\n  constructor(name) {\n    this.name = name;\n  }\n  speak() {\n    console.log(`${this.name}が鳴いています`);\n  }\n}\nconst dog = new Animal("犬");\ndog.speak();',
    requiredElements: ['class', 'animal', 'constructor', 'this.name', 'speak', 'new', 'console.log']
  },

  // ===== 実践（レベル6）6問 =====
  {
    level: 6,
    title: 'ショッピングカート計算',
    description: '商品リストから合計金額を計算しよう',
    task: 'cartに商品オブジェクト（name, price, quantity）の配列があります。reduceを使って合計金額を計算し、「合計: ¥○○」の形式で出力してください。',
    hint: 'reduce で price * quantity の合計を計算します',
    type: 'javascript',
    starter: 'const cart = [\n  { name: "りんご", price: 150, quantity: 3 },\n  { name: "バナナ", price: 100, quantity: 2 },\n  { name: "オレンジ", price: 200, quantity: 1 }\n];',
    answer: 'const cart = [\n  { name: "りんご", price: 150, quantity: 3 },\n  { name: "バナナ", price: 100, quantity: 2 },\n  { name: "オレンジ", price: 200, quantity: 1 }\n];\n\nconst total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);\nconsole.log(`合計: ¥${total}`);',
    requiredElements: ['cart', 'reduce', 'price', 'quantity', 'console.log', '合計']
  },
  {
    level: 6,
    title: 'ユーザー検索フィルター',
    description: '複数条件でユーザーを絞り込もう',
    task: 'usersから、年齢20歳以上かつアクティブ(isActive: true)なユーザーだけをfilterで抽出し、名前だけの配列に変換(map)して出力してください。',
    hint: 'filter と map をチェーンで繋げます',
    type: 'javascript',
    starter: 'const users = [\n  { name: "田中", age: 25, isActive: true },\n  { name: "佐藤", age: 17, isActive: true },\n  { name: "鈴木", age: 30, isActive: false },\n  { name: "高橋", age: 22, isActive: true }\n];',
    answer: 'const users = [\n  { name: "田中", age: 25, isActive: true },\n  { name: "佐藤", age: 17, isActive: true },\n  { name: "鈴木", age: 30, isActive: false },\n  { name: "高橋", age: 22, isActive: true }\n];\n\nconst activeAdults = users\n  .filter(user => user.age >= 20 && user.isActive)\n  .map(user => user.name);\nconsole.log(activeAdults);',
    requiredElements: ['users', 'filter', 'age', '>=', '20', 'isactive', 'map', 'name', 'console.log']
  },
  {
    level: 6,
    title: 'データの集計・グループ化',
    description: 'カテゴリ別に商品数を集計しよう',
    task: 'productsをカテゴリ(category)別にグループ化し、各カテゴリの商品数をオブジェクトで出力してください。例: { 食品: 2, 飲料: 1 }',
    hint: 'reduce を使ってオブジェクトを構築します',
    type: 'javascript',
    starter: 'const products = [\n  { name: "りんご", category: "食品" },\n  { name: "コーラ", category: "飲料" },\n  { name: "パン", category: "食品" },\n  { name: "お茶", category: "飲料" },\n  { name: "ケーキ", category: "食品" }\n];',
    answer: 'const products = [\n  { name: "りんご", category: "食品" },\n  { name: "コーラ", category: "飲料" },\n  { name: "パン", category: "食品" },\n  { name: "お茶", category: "飲料" },\n  { name: "ケーキ", category: "食品" }\n];\n\nconst counts = products.reduce((acc, product) => {\n  acc[product.category] = (acc[product.category] || 0) + 1;\n  return acc;\n}, {});\nconsole.log(counts);',
    requiredElements: ['products', 'reduce', 'category', 'acc', 'console.log']
  },
  {
    level: 6,
    title: 'Promise / 非同期処理',
    description: 'Promiseを使った非同期処理を理解しよう',
    task: 'fetchUserData関数を作り、Promiseを返してください。1秒後に{ id: 1, name: "太郎" }を resolve します。関数を呼び出し、thenでデータを出力してください。',
    hint: 'new Promise((resolve) => setTimeout(() => resolve(data), 1000))',
    type: 'javascript',
    starter: '',
    answer: 'function fetchUserData() {\n  return new Promise((resolve) => {\n    setTimeout(() => {\n      resolve({ id: 1, name: "太郎" });\n    }, 1000);\n  });\n}\n\nfetchUserData().then(user => {\n  console.log(user);\n});',
    requiredElements: ['function', 'fetchuserdata', 'promise', 'resolve', 'settimeout', 'then', 'console.log']
  },
  {
    level: 6,
    title: 'エラーハンドリング',
    description: 'try-catchでエラーを処理しよう',
    task: 'parseJSON関数を作り、JSON文字列をパースしてください。不正なJSONの場合はエラーをキャッチして「パースエラー」と出力します。正常時はパース結果を出力。',
    hint: 'try { JSON.parse() } catch (e) { } の形式です',
    type: 'javascript',
    starter: 'const validJSON = \'{"name":"太郎","age":25}\';\nconst invalidJSON = \'{name:太郎}\';\n\n// parseJSON関数を作成',
    answer: 'const validJSON = \'{"name":"太郎","age":25}\';\nconst invalidJSON = \'{name:太郎}\';\n\nfunction parseJSON(str) {\n  try {\n    const result = JSON.parse(str);\n    console.log(result);\n    return result;\n  } catch (e) {\n    console.log("パースエラー");\n    return null;\n  }\n}\n\nparseJSON(validJSON);\nparseJSON(invalidJSON);',
    requiredElements: ['function', 'parsejson', 'try', 'catch', 'json.parse', 'console.log', 'パースエラー']
  },
  {
    level: 6,
    title: 'イベント風のコールバック処理',
    description: 'コールバック関数を使ったイベント処理を学ぼう',
    task: 'EventEmitterクラスを作り、on(イベント登録)とemit(イベント発火)メソッドを実装してください。"click"イベントに「クリックされました」と出力する処理を登録し、発火させてください。',
    hint: 'イベント名をキーに、コールバック配列を値として管理します',
    type: 'javascript',
    starter: '',
    answer: 'class EventEmitter {\n  constructor() {\n    this.events = {};\n  }\n  \n  on(event, callback) {\n    if (!this.events[event]) {\n      this.events[event] = [];\n    }\n    this.events[event].push(callback);\n  }\n  \n  emit(event) {\n    if (this.events[event]) {\n      this.events[event].forEach(cb => cb());\n    }\n  }\n}\n\nconst emitter = new EventEmitter();\nemitter.on("click", () => console.log("クリックされました"));\nemitter.emit("click");',
    requiredElements: ['class', 'eventemitter', 'constructor', 'on', 'emit', 'events', 'console.log', 'クリックされました']
  }
];

// ==================== DOM操作問題 26問 ====================
const domExercises = [
  // ===== 入門（レベル1）4問 =====
  {
    level: 1,
    title: '要素を取得しよう',
    description: 'querySelectorで要素を取得する',
    task: 'querySelectorを使ってh1要素を取得し、console.logで出力してください。',
    hint: 'document.querySelector("セレクタ") で要素を取得できます',
    type: 'dom',
    previewHtml: '<h1>こんにちは</h1><p>段落です</p>',
    starter: '',
    answer: 'const heading = document.querySelector("h1");\nconsole.log(heading);',
    requiredElements: ['document.queryselector', 'h1', 'console.log']
  },
  {
    level: 1,
    title: 'IDで要素を取得',
    description: 'getElementByIdで要素を取得する',
    task: 'getElementByIdを使って id="message" の要素を取得し、console.logで出力してください。',
    hint: 'document.getElementById("id名") で取得できます',
    type: 'dom',
    previewHtml: '<p id="message">メッセージです</p>',
    starter: '',
    answer: 'const message = document.getElementById("message");\nconsole.log(message);',
    requiredElements: ['document.getelementbyid', 'message', 'console.log']
  },
  {
    level: 1,
    title: 'テキストを変更しよう',
    description: 'textContentでテキストを変更する',
    task: 'h1要素のテキストを「Hello World」に変更してください。',
    hint: '要素.textContent = "新しいテキスト" で変更できます',
    type: 'dom',
    previewHtml: '<h1>元のテキスト</h1>',
    starter: 'const h1 = document.querySelector("h1");',
    answer: 'const h1 = document.querySelector("h1");\nh1.textContent = "Hello World";',
    requiredElements: ['document.queryselector', 'textcontent', 'hello world']
  },
  {
    level: 1,
    title: 'HTMLを変更しよう',
    description: 'innerHTMLでHTMLを変更する',
    task: 'div要素の中身を「<strong>太字</strong>のテキスト」に変更してください。',
    hint: '要素.innerHTML = "HTML" でHTMLごと変更できます',
    type: 'dom',
    previewHtml: '<div id="content">元の内容</div>',
    starter: 'const div = document.querySelector("#content");',
    answer: 'const div = document.querySelector("#content");\ndiv.innerHTML = "<strong>太字</strong>のテキスト";',
    requiredElements: ['innerhtml', '<strong>', '太字']
  },

  // ===== 初級（レベル2）4問 =====
  {
    level: 2,
    title: 'スタイルを変更しよう',
    description: 'styleプロパティでCSSを変更する',
    task: 'p要素の文字色を赤（red）、フォントサイズを24pxに変更してください。',
    hint: '要素.style.color = "red" のように設定します',
    type: 'dom',
    previewHtml: '<p>スタイルが変わります</p>',
    previewCss: 'p { padding: 10px; background: #f0f0f0; }',
    starter: 'const p = document.querySelector("p");',
    answer: 'const p = document.querySelector("p");\np.style.color = "red";\np.style.fontSize = "24px";',
    requiredElements: ['style.color', 'red', 'style.fontsize', '24px']
  },
  {
    level: 2,
    title: 'クラスを追加しよう',
    description: 'classListでクラスを操作する',
    task: 'ボタン要素に "active" クラスを追加してください。',
    hint: '要素.classList.add("クラス名") で追加できます',
    type: 'dom',
    previewHtml: '<button>ボタン</button>',
    previewCss: 'button { padding: 10px 20px; } .active { background: #3498db; color: white; }',
    starter: 'const button = document.querySelector("button");',
    answer: 'const button = document.querySelector("button");\nbutton.classList.add("active");',
    requiredElements: ['classlist.add', 'active']
  },
  {
    level: 2,
    title: 'クラスを切り替えよう',
    description: 'classList.toggleでクラスを切り替える',
    task: 'ボックス要素の "highlight" クラスを切り替えてください（toggleを使用）。',
    hint: '要素.classList.toggle("クラス名") で切り替えできます',
    type: 'dom',
    previewHtml: '<div class="box">クリックで切り替え</div>',
    previewCss: '.box { padding: 20px; background: #ecf0f1; } .highlight { background: #f1c40f; }',
    starter: 'const box = document.querySelector(".box");',
    answer: 'const box = document.querySelector(".box");\nbox.classList.toggle("highlight");',
    requiredElements: ['classlist.toggle', 'highlight']
  },
  {
    level: 2,
    title: '属性を変更しよう',
    description: 'setAttributeで属性を設定する',
    task: '画像のsrc属性を "new-image.jpg" に、alt属性を "新しい画像" に変更してください。',
    hint: '要素.setAttribute("属性名", "値") で設定できます',
    type: 'dom',
    previewHtml: '<img src="old-image.jpg" alt="古い画像" style="width:100px;height:100px;background:#ddd;">',
    starter: 'const img = document.querySelector("img");',
    answer: 'const img = document.querySelector("img");\nimg.setAttribute("src", "new-image.jpg");\nimg.setAttribute("alt", "新しい画像");',
    requiredElements: ['setattribute', 'src', 'new-image.jpg', 'alt', '新しい画像']
  },

  // ===== 中級（レベル3）4問 =====
  {
    level: 3,
    title: '要素を作成しよう',
    description: 'createElementで新しい要素を作成する',
    task: '新しいp要素を作成し、テキスト「新しい段落」を設定して、#containerに追加してください。',
    hint: 'document.createElement("タグ名") で作成し、appendChild で追加します',
    type: 'dom',
    previewHtml: '<div id="container"><p>既存の段落</p></div>',
    starter: 'const container = document.querySelector("#container");',
    answer: 'const container = document.querySelector("#container");\nconst newP = document.createElement("p");\nnewP.textContent = "新しい段落";\ncontainer.appendChild(newP);',
    requiredElements: ['document.createelement', 'p', 'textcontent', '新しい段落', 'appendchild']
  },
  {
    level: 3,
    title: '要素を削除しよう',
    description: 'removeで要素を削除する',
    task: 'id="remove-me" の要素を削除してください。',
    hint: '要素.remove() で要素を削除できます',
    type: 'dom',
    previewHtml: '<ul><li>項目1</li><li id="remove-me">削除される項目</li><li>項目3</li></ul>',
    starter: '',
    answer: 'const element = document.querySelector("#remove-me");\nelement.remove();',
    requiredElements: ['queryselector', 'remove-me', 'remove()']
  },
  {
    level: 3,
    title: '複数の要素を取得',
    description: 'querySelectorAllで複数要素を取得する',
    task: 'すべてのli要素を取得し、forEachで各要素のテキストをconsole.logで出力してください。',
    hint: 'querySelectorAll は NodeList を返し、forEach でループできます',
    type: 'dom',
    previewHtml: '<ul><li>りんご</li><li>みかん</li><li>ぶどう</li></ul>',
    starter: '',
    answer: 'const items = document.querySelectorAll("li");\nitems.forEach(item => {\n  console.log(item.textContent);\n});',
    requiredElements: ['queryselectorall', 'li', 'foreach', 'textcontent', 'console.log']
  },
  {
    level: 3,
    title: 'クリックイベントを設定',
    description: 'addEventListenerでイベントを設定する',
    task: 'ボタンにクリックイベントを設定し、クリック時に「クリックされました！」とconsole.logで出力してください。',
    hint: '要素.addEventListener("click", 関数) でイベントを設定します',
    type: 'dom',
    previewHtml: '<button id="btn">クリックしてね</button>',
    previewCss: 'button { padding: 10px 20px; cursor: pointer; }',
    starter: 'const button = document.querySelector("#btn");',
    answer: 'const button = document.querySelector("#btn");\nbutton.addEventListener("click", () => {\n  console.log("クリックされました！");\n});',
    requiredElements: ['addeventlistener', 'click', 'console.log', 'クリックされました']
  },

  // ===== 中上級（レベル4）4問 =====
  {
    level: 4,
    title: 'フォームの値を取得',
    description: 'input要素の値を取得する',
    task: '入力欄の値を取得して「入力値: ○○」の形式でconsole.logに出力してください。',
    hint: 'input要素.value で値を取得できます',
    type: 'dom',
    previewHtml: '<input type="text" id="name" value="テスト太郎"><button id="btn">取得</button>',
    previewCss: 'input { padding: 8px; margin-right: 10px; }',
    starter: 'const input = document.querySelector("#name");\nconst button = document.querySelector("#btn");\n\nbutton.addEventListener("click", () => {\n  // ここに入力値を取得して出力するコードを書く\n});',
    answer: 'const input = document.querySelector("#name");\nconst button = document.querySelector("#btn");\n\nbutton.addEventListener("click", () => {\n  console.log("入力値: " + input.value);\n});',
    requiredElements: ['addeventlistener', 'click', 'input.value', 'console.log', '入力値']
  },
  {
    level: 4,
    title: 'イベントオブジェクト',
    description: 'イベントオブジェクトを活用する',
    task: 'ボタンクリック時に、event.target からボタンのテキストを取得してconsole.logで出力してください。',
    hint: 'イベントハンドラの引数 event から event.target でクリックされた要素を取得できます',
    type: 'dom',
    previewHtml: '<button>ボタンA</button><button>ボタンB</button><button>ボタンC</button>',
    previewCss: 'button { padding: 10px 20px; margin: 5px; cursor: pointer; }',
    starter: 'const buttons = document.querySelectorAll("button");\n\nbuttons.forEach(btn => {\n  btn.addEventListener("click", (event) => {\n    // event.targetを使ってテキストを出力\n  });\n});',
    answer: 'const buttons = document.querySelectorAll("button");\n\nbuttons.forEach(btn => {\n  btn.addEventListener("click", (event) => {\n    console.log(event.target.textContent);\n  });\n});',
    requiredElements: ['queryselectorall', 'foreach', 'addeventlistener', 'event.target', 'textcontent', 'console.log']
  },
  {
    level: 4,
    title: 'フォーム送信を制御',
    description: 'preventDefault()でデフォルト動作を防ぐ',
    task: 'フォーム送信時にページ遷移を防ぎ、入力された名前を「送信: ○○」の形式でconsole.logに出力してください。',
    hint: 'event.preventDefault() でデフォルトの送信動作を防げます',
    type: 'dom',
    previewHtml: '<form id="myForm"><input type="text" name="username" value="山田"><button type="submit">送信</button></form>',
    previewCss: 'input { padding: 8px; margin-right: 10px; }',
    starter: 'const form = document.querySelector("#myForm");',
    answer: 'const form = document.querySelector("#myForm");\n\nform.addEventListener("submit", (event) => {\n  event.preventDefault();\n  const name = form.querySelector("input").value;\n  console.log("送信: " + name);\n});',
    requiredElements: ['addeventlistener', 'submit', 'preventdefault', 'value', 'console.log', '送信']
  },
  {
    level: 4,
    title: '親要素・子要素にアクセス',
    description: 'parentElement, childrenで階層を移動',
    task: 'li要素をクリックしたとき、その親要素(ul)のidと、その親が持つ子要素の数をconsole.logで出力してください。',
    hint: '要素.parentElement で親要素、要素.children で子要素を取得できます',
    type: 'dom',
    previewHtml: '<ul id="fruits"><li>りんご</li><li>みかん</li><li>ぶどう</li></ul>',
    previewCss: 'li { cursor: pointer; padding: 5px; } li:hover { background: #ecf0f1; }',
    starter: 'const items = document.querySelectorAll("li");',
    answer: 'const items = document.querySelectorAll("li");\n\nitems.forEach(item => {\n  item.addEventListener("click", () => {\n    const parent = item.parentElement;\n    console.log("親のID: " + parent.id);\n    console.log("子要素の数: " + parent.children.length);\n  });\n});',
    requiredElements: ['addeventlistener', 'click', 'parentelement', 'children', 'length', 'console.log']
  },

  // ===== 上級（レベル5）4問 =====
  {
    level: 5,
    title: 'イベント委譲',
    description: 'イベント委譲パターンを学ぶ',
    task: 'ul要素に1つのイベントリスナーを設定し、クリックされたliのテキストを出力してください（イベント委譲）。',
    hint: '親要素にイベントを設定し、event.target で実際にクリックされた要素を判定します',
    type: 'dom',
    previewHtml: '<ul id="list"><li>項目1</li><li>項目2</li><li>項目3</li></ul>',
    previewCss: 'li { cursor: pointer; padding: 8px; } li:hover { background: #3498db; color: white; }',
    starter: 'const list = document.querySelector("#list");',
    answer: 'const list = document.querySelector("#list");\n\nlist.addEventListener("click", (event) => {\n  if (event.target.tagName === "LI") {\n    console.log(event.target.textContent);\n  }\n});',
    requiredElements: ['addeventlistener', 'click', 'event.target', 'tagname', 'li', 'textcontent']
  },
  {
    level: 5,
    title: 'リストに項目を追加',
    description: '入力値を使って動的に要素を追加する',
    task: '「追加」ボタンクリック時に、入力欄の値を新しいliとしてリストに追加してください。追加後は入力欄を空にしてください。',
    hint: 'createElement でli を作成し、appendChild で追加します',
    type: 'dom',
    previewHtml: '<input type="text" id="newItem" placeholder="新しい項目"><button id="addBtn">追加</button><ul id="itemList"><li>既存の項目</li></ul>',
    previewCss: 'input { padding: 8px; } button { padding: 8px 16px; margin-left: 8px; } ul { margin-top: 16px; }',
    starter: 'const input = document.querySelector("#newItem");\nconst addBtn = document.querySelector("#addBtn");\nconst list = document.querySelector("#itemList");',
    answer: 'const input = document.querySelector("#newItem");\nconst addBtn = document.querySelector("#addBtn");\nconst list = document.querySelector("#itemList");\n\naddBtn.addEventListener("click", () => {\n  if (input.value) {\n    const li = document.createElement("li");\n    li.textContent = input.value;\n    list.appendChild(li);\n    input.value = "";\n  }\n});',
    requiredElements: ['addeventlistener', 'click', 'createelement', 'li', 'textcontent', 'appendchild', 'input.value', '""']
  },
  {
    level: 5,
    title: 'データ属性の活用',
    description: 'data-*属性を使ったDOM操作',
    task: 'ボタンクリック時に、data-price 属性の値を取得して「価格: ¥○○」の形式で出力してください。',
    hint: '要素.dataset.price でdata-price属性の値を取得できます',
    type: 'dom',
    previewHtml: '<div class="product"><h3>商品A</h3><button data-price="1980">価格を見る</button></div><div class="product"><h3>商品B</h3><button data-price="2980">価格を見る</button></div>',
    previewCss: '.product { border: 1px solid #ddd; padding: 15px; margin: 10px 0; } button { padding: 8px 16px; cursor: pointer; }',
    starter: 'const buttons = document.querySelectorAll("button");',
    answer: 'const buttons = document.querySelectorAll("button");\n\nbuttons.forEach(btn => {\n  btn.addEventListener("click", () => {\n    const price = btn.dataset.price;\n    console.log("価格: ¥" + price);\n  });\n});',
    requiredElements: ['queryselectorall', 'foreach', 'addeventlistener', 'dataset.price', 'console.log', '価格']
  },
  {
    level: 5,
    title: 'クリックで項目を削除',
    description: '動的な要素の削除処理',
    task: '各li要素に「×」ボタンを追加し、クリックでその項目を削除できるようにしてください。',
    hint: 'イベント委譲を使うと、動的に追加された要素にも対応できます',
    type: 'dom',
    previewHtml: '<ul id="todoList"><li>タスク1</li><li>タスク2</li><li>タスク3</li></ul>',
    previewCss: 'li { padding: 10px; display: flex; justify-content: space-between; border-bottom: 1px solid #eee; } .delete-btn { color: red; cursor: pointer; border: none; background: none; }',
    starter: 'const list = document.querySelector("#todoList");\nconst items = list.querySelectorAll("li");\n\n// 各liに削除ボタンを追加',
    answer: 'const list = document.querySelector("#todoList");\nconst items = list.querySelectorAll("li");\n\nitems.forEach(item => {\n  const deleteBtn = document.createElement("button");\n  deleteBtn.textContent = "×";\n  deleteBtn.className = "delete-btn";\n  item.appendChild(deleteBtn);\n});\n\nlist.addEventListener("click", (event) => {\n  if (event.target.classList.contains("delete-btn")) {\n    event.target.parentElement.remove();\n  }\n});',
    requiredElements: ['foreach', 'createelement', 'button', 'appendchild', 'addeventlistener', 'classlist.contains', 'parentelement', 'remove']
  },

  // ===== 実践（レベル6）6問 =====
  {
    level: 6,
    title: 'タブ切り替えUI',
    description: 'タブクリックでコンテンツを切り替える',
    task: 'タブをクリックすると対応するコンテンツが表示されるUIを実装してください。activeクラスで表示を制御します。',
    hint: '全てのタブとコンテンツからactiveを外し、クリックされたものにactiveを付けます',
    type: 'dom',
    previewHtml: '<div class="tabs"><button class="tab active" data-tab="tab1">タブ1</button><button class="tab" data-tab="tab2">タブ2</button><button class="tab" data-tab="tab3">タブ3</button></div><div class="contents"><div class="content active" id="tab1">タブ1の内容です</div><div class="content" id="tab2">タブ2の内容です</div><div class="content" id="tab3">タブ3の内容です</div></div>',
    previewCss: '.tabs { display: flex; gap: 5px; } .tab { padding: 10px 20px; border: none; background: #ecf0f1; cursor: pointer; } .tab.active { background: #3498db; color: white; } .content { display: none; padding: 20px; background: #f9f9f9; } .content.active { display: block; }',
    starter: 'const tabs = document.querySelectorAll(".tab");\nconst contents = document.querySelectorAll(".content");',
    answer: 'const tabs = document.querySelectorAll(".tab");\nconst contents = document.querySelectorAll(".content");\n\ntabs.forEach(tab => {\n  tab.addEventListener("click", () => {\n    tabs.forEach(t => t.classList.remove("active"));\n    contents.forEach(c => c.classList.remove("active"));\n    \n    tab.classList.add("active");\n    const targetId = tab.dataset.tab;\n    document.getElementById(targetId).classList.add("active");\n  });\n});',
    requiredElements: ['queryselectorall', 'foreach', 'addeventlistener', 'classlist.remove', 'classlist.add', 'active', 'dataset.tab', 'getelementbyid']
  },
  {
    level: 6,
    title: 'モーダルウィンドウ',
    description: 'モーダルの開閉を実装する',
    task: '「開く」ボタンでモーダルを表示し、「閉じる」ボタンまたは背景クリックで閉じる機能を実装してください。',
    hint: 'showクラスの追加/削除でモーダルの表示を制御します',
    type: 'dom',
    previewHtml: '<button id="openBtn">モーダルを開く</button><div class="modal-overlay" id="modal"><div class="modal-content"><h2>モーダルタイトル</h2><p>モーダルの内容がここに入ります。</p><button id="closeBtn">閉じる</button></div></div>',
    previewCss: '.modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; } .modal-overlay.show { display: flex; } .modal-content { background: white; padding: 30px; border-radius: 10px; max-width: 400px; } button { padding: 10px 20px; cursor: pointer; }',
    starter: 'const openBtn = document.querySelector("#openBtn");\nconst closeBtn = document.querySelector("#closeBtn");\nconst modal = document.querySelector("#modal");',
    answer: 'const openBtn = document.querySelector("#openBtn");\nconst closeBtn = document.querySelector("#closeBtn");\nconst modal = document.querySelector("#modal");\n\nopenBtn.addEventListener("click", () => {\n  modal.classList.add("show");\n});\n\ncloseBtn.addEventListener("click", () => {\n  modal.classList.remove("show");\n});\n\nmodal.addEventListener("click", (event) => {\n  if (event.target === modal) {\n    modal.classList.remove("show");\n  }\n});',
    requiredElements: ['addeventlistener', 'click', 'classlist.add', 'classlist.remove', 'show', 'event.target', '===', 'modal']
  },
  {
    level: 6,
    title: 'アコーディオンメニュー',
    description: 'クリックで開閉するアコーディオンを実装',
    task: '質問をクリックすると回答が表示/非表示になるアコーディオンを実装してください。',
    hint: '各質問にクリックイベントを設定し、次の要素（回答）のopenクラスを切り替えます',
    type: 'dom',
    previewHtml: '<div class="accordion"><div class="accordion-item"><div class="question">質問1: HTMLとは？</div><div class="answer">HTMLはウェブページの構造を定義する言語です。</div></div><div class="accordion-item"><div class="question">質問2: CSSとは？</div><div class="answer">CSSはウェブページのスタイルを定義する言語です。</div></div><div class="accordion-item"><div class="question">質問3: JavaScriptとは？</div><div class="answer">JavaScriptはウェブページに動きを付ける言語です。</div></div></div>',
    previewCss: '.accordion-item { border: 1px solid #ddd; margin-bottom: 5px; } .question { padding: 15px; background: #f5f5f5; cursor: pointer; font-weight: bold; } .question:hover { background: #e0e0e0; } .answer { padding: 15px; display: none; } .answer.open { display: block; background: #fafafa; }',
    starter: 'const questions = document.querySelectorAll(".question");',
    answer: 'const questions = document.querySelectorAll(".question");\n\nquestions.forEach(question => {\n  question.addEventListener("click", () => {\n    const answer = question.nextElementSibling;\n    answer.classList.toggle("open");\n  });\n});',
    requiredElements: ['queryselectorall', 'foreach', 'addeventlistener', 'click', 'nextelementsibling', 'classlist.toggle', 'open']
  },
  {
    level: 6,
    title: 'カウンターアプリ',
    description: '増減ボタンでカウントを操作',
    task: '+ボタンで増加、-ボタンで減少、リセットボタンで0に戻るカウンターを実装してください。',
    hint: '変数でカウントを管理し、ボタンクリックで更新・表示します',
    type: 'dom',
    previewHtml: '<div class="counter"><button id="decrease">-</button><span id="count">0</span><button id="increase">+</button><button id="reset">リセット</button></div>',
    previewCss: '.counter { display: flex; align-items: center; gap: 15px; font-size: 24px; } button { padding: 10px 20px; font-size: 20px; cursor: pointer; } #count { min-width: 60px; text-align: center; }',
    starter: 'let count = 0;\nconst countDisplay = document.querySelector("#count");\nconst increaseBtn = document.querySelector("#increase");\nconst decreaseBtn = document.querySelector("#decrease");\nconst resetBtn = document.querySelector("#reset");',
    answer: 'let count = 0;\nconst countDisplay = document.querySelector("#count");\nconst increaseBtn = document.querySelector("#increase");\nconst decreaseBtn = document.querySelector("#decrease");\nconst resetBtn = document.querySelector("#reset");\n\nfunction updateDisplay() {\n  countDisplay.textContent = count;\n}\n\nincreaseBtn.addEventListener("click", () => {\n  count++;\n  updateDisplay();\n});\n\ndecreaseBtn.addEventListener("click", () => {\n  count--;\n  updateDisplay();\n});\n\nresetBtn.addEventListener("click", () => {\n  count = 0;\n  updateDisplay();\n});',
    requiredElements: ['let', 'count', 'function', 'textcontent', 'addeventlistener', 'click', 'count++', 'count--', 'count = 0']
  },
  {
    level: 6,
    title: 'ToDoリスト',
    description: '追加・完了・削除機能を持つToDoリスト',
    task: '入力欄からタスクを追加、クリックで完了（打ち消し線）、×ボタンで削除できるToDoリストを実装してください。',
    hint: 'createElement で li を作成し、完了は toggle で done クラスを切り替えます',
    type: 'dom',
    previewHtml: '<div class="todo-app"><input type="text" id="todoInput" placeholder="タスクを入力"><button id="addTodo">追加</button><ul id="todoList"></ul></div>',
    previewCss: '.todo-app { max-width: 400px; } input { padding: 10px; width: 200px; } button { padding: 10px 20px; cursor: pointer; } ul { list-style: none; padding: 0; margin-top: 20px; } li { padding: 10px; background: #f5f5f5; margin: 5px 0; display: flex; justify-content: space-between; cursor: pointer; } li.done { text-decoration: line-through; color: #888; } .delete { color: red; cursor: pointer; }',
    starter: 'const input = document.querySelector("#todoInput");\nconst addBtn = document.querySelector("#addTodo");\nconst list = document.querySelector("#todoList");',
    answer: 'const input = document.querySelector("#todoInput");\nconst addBtn = document.querySelector("#addTodo");\nconst list = document.querySelector("#todoList");\n\naddBtn.addEventListener("click", () => {\n  if (!input.value) return;\n  \n  const li = document.createElement("li");\n  li.innerHTML = `<span>${input.value}</span><span class="delete">×</span>`;\n  list.appendChild(li);\n  input.value = "";\n});\n\nlist.addEventListener("click", (event) => {\n  if (event.target.classList.contains("delete")) {\n    event.target.parentElement.remove();\n  } else if (event.target.tagName === "SPAN" || event.target.tagName === "LI") {\n    event.target.closest("li").classList.toggle("done");\n  }\n});',
    requiredElements: ['addeventlistener', 'click', 'createelement', 'li', 'innerhtml', 'appendchild', 'classlist.contains', 'delete', 'remove', 'classlist.toggle', 'done']
  },
  {
    level: 6,
    title: 'リアルタイム検索フィルター',
    description: '入力に応じてリストをフィルタリング',
    task: '検索欄に入力すると、リアルタイムでリストをフィルタリングする機能を実装してください。',
    hint: 'inputイベントで入力を監視し、各項目のテキストに検索語が含まれるかチェックします',
    type: 'dom',
    previewHtml: '<input type="text" id="search" placeholder="検索..."><ul id="list"><li>JavaScript入門</li><li>HTML基礎</li><li>CSS実践</li><li>Reactチュートリアル</li><li>Node.js入門</li></ul>',
    previewCss: 'input { padding: 10px; width: 100%; margin-bottom: 15px; box-sizing: border-box; } li { padding: 10px; border-bottom: 1px solid #eee; } li.hidden { display: none; }',
    starter: 'const searchInput = document.querySelector("#search");\nconst items = document.querySelectorAll("#list li");',
    answer: 'const searchInput = document.querySelector("#search");\nconst items = document.querySelectorAll("#list li");\n\nsearchInput.addEventListener("input", () => {\n  const searchTerm = searchInput.value.toLowerCase();\n  \n  items.forEach(item => {\n    const text = item.textContent.toLowerCase();\n    if (text.includes(searchTerm)) {\n      item.classList.remove("hidden");\n    } else {\n      item.classList.add("hidden");\n    }\n  });\n});',
    requiredElements: ['addeventlistener', 'input', 'tolowercase', 'foreach', 'textcontent', 'includes', 'classlist.remove', 'classlist.add', 'hidden']
  }
];

// レスポンシブデザイン問題
const responsiveExercises = [
  // Level 1: 入門
  {
    level: 1,
    title: 'メディアクエリの基本',
    description: '@mediaを使って画面幅に応じてスタイルを変更',
    task: '画面幅が600px以下の時、.boxの背景色を青(#3498db)にしてください。',
    hint: '@media (max-width: 600px) { } で600px以下のスタイルを定義します',
    type: 'css',
    previewHtml: '<div class="box">レスポンシブボックス</div>',
    previewCss: '.box { padding: 30px; background: #e74c3c; color: white; text-align: center; }',
    answer: '@media (max-width: 600px) {\n  .box {\n    background: #3498db;\n  }\n}',
    requiredElements: ['@media', 'max-width', '600px', '.box', 'background', '#3498db']
  },
  {
    level: 1,
    title: 'フォントサイズの切り替え',
    description: '画面幅に応じてフォントサイズを変更',
    task: '画面幅が480px以下の時、h1のフォントサイズを24pxにしてください。',
    hint: '@media (max-width: 480px) でモバイル向けスタイルを定義',
    type: 'css',
    previewHtml: '<h1>レスポンシブタイトル</h1>',
    previewCss: 'h1 { font-size: 48px; color: #333; }',
    answer: '@media (max-width: 480px) {\n  h1 {\n    font-size: 24px;\n  }\n}',
    requiredElements: ['@media', 'max-width', '480px', 'h1', 'font-size', '24px']
  },
  {
    level: 1,
    title: 'パディングの調整',
    description: '画面幅に応じて余白を変更',
    task: '画面幅が768px以下の時、.containerのパディングを10pxにしてください。',
    hint: 'モバイルでは余白を小さくして画面を有効活用します',
    type: 'css',
    previewHtml: '<div class="container"><p>コンテンツエリア</p></div>',
    previewCss: '.container { padding: 40px; background: #f5f5f5; }',
    answer: '@media (max-width: 768px) {\n  .container {\n    padding: 10px;\n  }\n}',
    requiredElements: ['@media', 'max-width', '768px', '.container', 'padding', '10px']
  },
  {
    level: 1,
    title: '要素の非表示',
    description: '画面幅に応じて要素を非表示',
    task: '画面幅が600px以下の時、.sidebarをdisplay: noneで非表示にしてください。',
    hint: 'モバイルでは不要な要素を非表示にできます',
    type: 'css',
    previewHtml: '<div class="main">メインコンテンツ</div><div class="sidebar">サイドバー</div>',
    previewCss: '.main { background: #3498db; padding: 20px; color: white; } .sidebar { background: #2ecc71; padding: 20px; color: white; margin-top: 10px; }',
    answer: '@media (max-width: 600px) {\n  .sidebar {\n    display: none;\n  }\n}',
    requiredElements: ['@media', 'max-width', '600px', '.sidebar', 'display', 'none']
  },
  // Level 2: 初級
  {
    level: 2,
    title: 'Flexboxの方向切り替え',
    description: '画面幅に応じてFlexboxの方向を変更',
    task: '画面幅が768px以下の時、.containerのflex-directionをcolumnにしてください。',
    hint: 'flex-direction: column で縦並びになります',
    type: 'css',
    previewHtml: '<div class="container"><div class="item">1</div><div class="item">2</div><div class="item">3</div></div>',
    previewCss: '.container { display: flex; gap: 10px; } .item { background: #9b59b6; color: white; padding: 30px; flex: 1; text-align: center; }',
    answer: '@media (max-width: 768px) {\n  .container {\n    flex-direction: column;\n  }\n}',
    requiredElements: ['@media', 'max-width', '768px', '.container', 'flex-direction', 'column']
  },
  {
    level: 2,
    title: '複数のブレークポイント',
    description: '複数の画面幅で異なるスタイルを適用',
    task: '.boxの背景色を768px以下で青(#3498db)、480px以下で緑(#2ecc71)にしてください。',
    hint: '複数の@mediaルールを使い、小さい方を後に書きます',
    type: 'css',
    previewHtml: '<div class="box">マルチブレークポイント</div>',
    previewCss: '.box { padding: 30px; background: #e74c3c; color: white; text-align: center; }',
    answer: '@media (max-width: 768px) {\n  .box {\n    background: #3498db;\n  }\n}\n\n@media (max-width: 480px) {\n  .box {\n    background: #2ecc71;\n  }\n}',
    requiredElements: ['@media', 'max-width', '768px', '480px', '.box', 'background', '#3498db', '#2ecc71']
  },
  {
    level: 2,
    title: 'Gridの列数変更',
    description: '画面幅に応じてグリッドの列数を変更',
    task: '画面幅が600px以下の時、.gridのgrid-template-columnsを1frにしてください。',
    hint: '1列にすることで縦並びになります',
    type: 'css',
    previewHtml: '<div class="grid"><div class="card">1</div><div class="card">2</div><div class="card">3</div><div class="card">4</div></div>',
    previewCss: '.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; } .card { background: #e67e22; color: white; padding: 30px; text-align: center; }',
    answer: '@media (max-width: 600px) {\n  .grid {\n    grid-template-columns: 1fr;\n  }\n}',
    requiredElements: ['@media', 'max-width', '600px', '.grid', 'grid-template-columns', '1fr']
  },
  {
    level: 2,
    title: '画像の最大幅',
    description: 'レスポンシブ画像の基本',
    task: 'imgにmax-width: 100%とheight: autoを設定してレスポンシブ画像にしてください。',
    hint: 'max-width: 100%で親要素に収まり、height: autoで縦横比を維持',
    type: 'css',
    previewHtml: '<div class="image-container"><img src="https://via.placeholder.com/400x300" alt="サンプル画像"></div>',
    previewCss: '.image-container { max-width: 300px; background: #f5f5f5; padding: 10px; }',
    answer: 'img {\n  max-width: 100%;\n  height: auto;\n}',
    requiredElements: ['img', 'max-width', '100%', 'height', 'auto']
  },
  // Level 3: 中級
  {
    level: 3,
    title: 'モバイルファースト',
    description: 'min-widthを使ったモバイルファースト設計',
    task: '.boxの基本パディングを15pxにし、768px以上でパディングを40pxにしてください。',
    hint: 'モバイルファーストではmin-widthを使い、大きい画面向けを追加',
    type: 'css',
    previewHtml: '<div class="box">モバイルファースト</div>',
    previewCss: '',
    answer: '.box {\n  padding: 15px;\n  background: #3498db;\n  color: white;\n}\n\n@media (min-width: 768px) {\n  .box {\n    padding: 40px;\n  }\n}',
    requiredElements: ['.box', 'padding', '15px', '@media', 'min-width', '768px', '40px']
  },
  {
    level: 3,
    title: 'ビューポート単位',
    description: 'vwとvhを使ったサイズ指定',
    task: '.heroのheightを50vh、.titleのfont-sizeを5vwにしてください。',
    hint: 'vhは画面高さの%、vwは画面幅の%です',
    type: 'css',
    previewHtml: '<div class="hero"><h1 class="title">ビューポート単位</h1></div>',
    previewCss: '.hero { background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; } .title { color: white; margin: 0; }',
    answer: '.hero {\n  height: 50vh;\n}\n\n.title {\n  font-size: 5vw;\n}',
    requiredElements: ['.hero', 'height', '50vh', '.title', 'font-size', '5vw']
  },
  {
    level: 3,
    title: 'clamp()関数',
    description: 'clamp()で最小・最大を制限したサイズ',
    task: 'h1のfont-sizeをclamp(20px, 5vw, 48px)にしてください。',
    hint: 'clamp(最小値, 理想値, 最大値)で範囲を制限できます',
    type: 'css',
    previewHtml: '<h1>レスポンシブフォント</h1>',
    previewCss: 'h1 { color: #333; }',
    answer: 'h1 {\n  font-size: clamp(20px, 5vw, 48px);\n}',
    requiredElements: ['h1', 'font-size', 'clamp', '20px', '5vw', '48px']
  },
  {
    level: 3,
    title: 'ナビゲーションの切り替え',
    description: 'PC/モバイルでナビゲーションスタイルを変更',
    task: '.navをflexで横並び、768px以下でflex-direction: columnで縦並びにしてください。',
    hint: 'PC版は横並び、モバイル版は縦並びが一般的',
    type: 'css',
    previewHtml: '<nav class="nav"><a href="#">ホーム</a><a href="#">サービス</a><a href="#">会社概要</a><a href="#">お問い合わせ</a></nav>',
    previewCss: '.nav a { padding: 10px 20px; text-decoration: none; color: white; background: #34495e; }',
    answer: '.nav {\n  display: flex;\n  gap: 5px;\n}\n\n@media (max-width: 768px) {\n  .nav {\n    flex-direction: column;\n  }\n}',
    requiredElements: ['.nav', 'display', 'flex', '@media', 'max-width', '768px', 'flex-direction', 'column']
  },
  // Level 4: 中上級
  {
    level: 4,
    title: 'カード列のレスポンシブ',
    description: 'auto-fitを使った自動カード配置',
    task: '.gridにgrid-template-columns: repeat(auto-fit, minmax(250px, 1fr))を設定してください。',
    hint: 'auto-fitとminmaxで自動的に列数が調整されます',
    type: 'css',
    previewHtml: '<div class="grid"><div class="card">カード1</div><div class="card">カード2</div><div class="card">カード3</div><div class="card">カード4</div><div class="card">カード5</div></div>',
    previewCss: '.card { background: #1abc9c; color: white; padding: 30px; text-align: center; }',
    answer: '.grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 20px;\n}',
    requiredElements: ['.grid', 'display', 'grid', 'grid-template-columns', 'repeat', 'auto-fit', 'minmax', '250px', '1fr']
  },
  {
    level: 4,
    title: 'アスペクト比の維持',
    description: 'aspect-ratioで縦横比を維持',
    task: '.videoにaspect-ratio: 16 / 9とwidth: 100%を設定してください。',
    hint: 'aspect-ratioで縦横比を固定できます',
    type: 'css',
    previewHtml: '<div class="video">16:9 動画エリア</div>',
    previewCss: '.video { background: #2c3e50; color: white; display: flex; align-items: center; justify-content: center; }',
    answer: '.video {\n  width: 100%;\n  aspect-ratio: 16 / 9;\n}',
    requiredElements: ['.video', 'width', '100%', 'aspect-ratio', '16', '9']
  },
  {
    level: 4,
    title: 'コンテナクエリの基礎',
    description: 'コンテナの幅に応じたスタイル変更',
    task: '.wrapperにcontainer-type: inline-sizeを設定し、@container (min-width: 400px)で.cardのflex-directionをrowにしてください。',
    hint: 'コンテナクエリは親要素の幅でスタイルを変更できます',
    type: 'css',
    previewHtml: '<div class="wrapper"><div class="card"><img src="https://via.placeholder.com/100" alt=""><div class="content"><h3>タイトル</h3><p>説明文</p></div></div></div>',
    previewCss: '.wrapper { width: 100%; resize: horizontal; overflow: auto; border: 2px dashed #ccc; padding: 10px; } .card { display: flex; flex-direction: column; background: #ecf0f1; } .card img { width: 100%; } .content { padding: 15px; }',
    answer: '.wrapper {\n  container-type: inline-size;\n}\n\n@container (min-width: 400px) {\n  .card {\n    flex-direction: row;\n  }\n}',
    requiredElements: ['.wrapper', 'container-type', 'inline-size', '@container', 'min-width', '400px', '.card', 'flex-direction', 'row']
  },
  {
    level: 4,
    title: 'レスポンシブテーブル',
    description: 'モバイルでテーブルをカード形式に',
    task: '768px以下でtd, thをdisplay: blockにし、tdにdata-label属性の内容を::beforeで表示してください。',
    hint: 'tdをブロックにしてdata-label属性で疑似要素にラベルを表示',
    type: 'css',
    previewHtml: '<table><thead><tr><th>名前</th><th>年齢</th><th>職業</th></tr></thead><tbody><tr><td data-label="名前">田中太郎</td><td data-label="年齢">30</td><td data-label="職業">エンジニア</td></tr><tr><td data-label="名前">鈴木花子</td><td data-label="年齢">25</td><td data-label="職業">デザイナー</td></tr></tbody></table>',
    previewCss: 'table { width: 100%; border-collapse: collapse; } th, td { padding: 12px; text-align: left; border: 1px solid #ddd; } th { background: #3498db; color: white; }',
    answer: '@media (max-width: 768px) {\n  thead {\n    display: none;\n  }\n  td, th {\n    display: block;\n  }\n  td::before {\n    content: attr(data-label) \": \";\n    font-weight: bold;\n  }\n}',
    requiredElements: ['@media', 'max-width', '768px', 'display', 'block', 'td::before', 'content', 'attr', 'data-label']
  },
  // Level 5: 上級
  {
    level: 5,
    title: '複雑なグリッドレイアウト',
    description: 'PC/タブレット/モバイルで異なるグリッド',
    task: '.gridをPC(3列)、タブレット768px以下(2列)、モバイル480px以下(1列)にしてください。',
    hint: '大きい順にブレークポイントを設定します',
    type: 'css',
    previewHtml: '<div class="grid"><div class="item">1</div><div class="item">2</div><div class="item">3</div><div class="item">4</div><div class="item">5</div><div class="item">6</div></div>',
    previewCss: '.item { background: #8e44ad; color: white; padding: 30px; text-align: center; }',
    answer: '.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 15px;\n}\n\n@media (max-width: 768px) {\n  .grid {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n\n@media (max-width: 480px) {\n  .grid {\n    grid-template-columns: 1fr;\n  }\n}',
    requiredElements: ['.grid', 'display', 'grid', 'grid-template-columns', 'repeat', '@media', 'max-width', '768px', '480px', '1fr']
  },
  {
    level: 5,
    title: 'フルードタイポグラフィ',
    description: 'calc()とvwを組み合わせた流動的なフォント',
    task: 'h1のfont-sizeをcalc(18px + 2vw)にしてください。',
    hint: 'calc()で固定値とビューポート単位を組み合わせられます',
    type: 'css',
    previewHtml: '<h1>フルードタイポグラフィ</h1><p>画面幅に応じてフォントサイズが滑らかに変化します。</p>',
    previewCss: 'p { color: #666; }',
    answer: 'h1 {\n  font-size: calc(18px + 2vw);\n}',
    requiredElements: ['h1', 'font-size', 'calc', '18px', '2vw']
  },
  {
    level: 5,
    title: 'オリエンテーション対応',
    description: '縦向き/横向きで異なるスタイル',
    task: '横向き(landscape)の時.galleryのgrid-template-columnsを4列(repeat(4, 1fr))にしてください。',
    hint: 'orientation: landscapeで横向きを検出',
    type: 'css',
    previewHtml: '<div class="gallery"><div>1</div><div>2</div><div>3</div><div>4</div></div>',
    previewCss: '.gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; } .gallery div { background: #16a085; color: white; padding: 30px; text-align: center; }',
    answer: '@media (orientation: landscape) {\n  .gallery {\n    grid-template-columns: repeat(4, 1fr);\n  }\n}',
    requiredElements: ['@media', 'orientation', 'landscape', '.gallery', 'grid-template-columns', 'repeat', '4', '1fr']
  },
  {
    level: 5,
    title: 'ダークモード対応',
    description: 'prefers-color-schemeでダークモード',
    task: 'ダークモード設定時、bodyの背景を#1a1a1a、文字色を#f0f0f0にしてください。',
    hint: 'prefers-color-scheme: darkでユーザーのダークモード設定を検出',
    type: 'css',
    previewHtml: '<h1>ダークモード対応</h1><p>システム設定に応じてスタイルが変わります。</p>',
    previewCss: 'body { padding: 20px; transition: background 0.3s, color 0.3s; }',
    answer: '@media (prefers-color-scheme: dark) {\n  body {\n    background: #1a1a1a;\n    color: #f0f0f0;\n  }\n}',
    requiredElements: ['@media', 'prefers-color-scheme', 'dark', 'body', 'background', '#1a1a1a', 'color', '#f0f0f0']
  },
  // Level 6: 実践
  {
    level: 6,
    title: 'レスポンシブヘッダー',
    description: '実践的なヘッダーのレスポンシブ対応',
    task: 'ヘッダーをPCでは横並び、768px以下では縦並びで中央揃えにしてください。ロゴは常に中央寄せです。',
    hint: 'headerにFlexboxを使い、モバイルでflex-direction: columnとalign-items: centerを適用',
    type: 'css',
    previewHtml: '<header><div class="logo">Logo</div><nav><a href="#">ホーム</a><a href="#">サービス</a><a href="#">お問い合わせ</a></nav></header>',
    previewCss: 'header { background: #2c3e50; padding: 15px 30px; } .logo { font-size: 24px; font-weight: bold; color: white; } nav a { color: white; text-decoration: none; padding: 10px 15px; }',
    answer: 'header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n\nnav {\n  display: flex;\n  gap: 10px;\n}\n\n@media (max-width: 768px) {\n  header {\n    flex-direction: column;\n    align-items: center;\n    gap: 15px;\n  }\n  nav {\n    flex-direction: column;\n    align-items: center;\n  }\n}',
    requiredElements: ['header', 'display', 'flex', 'justify-content', 'space-between', 'align-items', 'center', '@media', 'max-width', '768px', 'flex-direction', 'column']
  },
  {
    level: 6,
    title: 'レスポンシブカードグリッド',
    description: '実践的なカードレイアウト',
    task: 'auto-fillを使い、カードが最小280pxで自動的に配置されるグリッドを作成してください。gap は20pxです。',
    hint: 'grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))で自動レイアウト',
    type: 'css',
    previewHtml: '<div class="cards"><div class="card"><img src="https://via.placeholder.com/300x200" alt=""><div class="card-body"><h3>タイトル1</h3><p>説明文がここに入ります。</p></div></div><div class="card"><img src="https://via.placeholder.com/300x200" alt=""><div class="card-body"><h3>タイトル2</h3><p>説明文がここに入ります。</p></div></div><div class="card"><img src="https://via.placeholder.com/300x200" alt=""><div class="card-body"><h3>タイトル3</h3><p>説明文がここに入ります。</p></div></div></div>',
    previewCss: '.card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); } .card img { width: 100%; height: auto; } .card-body { padding: 20px; } .card h3 { margin: 0 0 10px; } .card p { color: #666; margin: 0; }',
    answer: '.cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\n  gap: 20px;\n}',
    requiredElements: ['.cards', 'display', 'grid', 'grid-template-columns', 'repeat', 'auto-fill', 'minmax', '280px', '1fr', 'gap', '20px']
  },
  {
    level: 6,
    title: 'レスポンシブフッター',
    description: '複数カラムのフッターをレスポンシブに',
    task: 'フッターを4カラム→2カラム(768px以下)→1カラム(480px以下)に変更してください。',
    hint: 'グリッドの列数をブレークポイントごとに変更',
    type: 'css',
    previewHtml: '<footer class="footer"><div class="footer-col"><h4>会社情報</h4><ul><li>会社概要</li><li>アクセス</li></ul></div><div class="footer-col"><h4>サービス</h4><ul><li>Web制作</li><li>コンサル</li></ul></div><div class="footer-col"><h4>サポート</h4><ul><li>FAQ</li><li>お問い合わせ</li></ul></div><div class="footer-col"><h4>SNS</h4><ul><li>Twitter</li><li>Facebook</li></ul></div></footer>',
    previewCss: '.footer { background: #2c3e50; padding: 40px 20px; } .footer-col { color: white; } .footer-col h4 { margin-bottom: 15px; } .footer-col ul { list-style: none; padding: 0; margin: 0; } .footer-col li { margin-bottom: 8px; color: #bdc3c7; }',
    answer: '.footer {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  gap: 30px;\n}\n\n@media (max-width: 768px) {\n  .footer {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n\n@media (max-width: 480px) {\n  .footer {\n    grid-template-columns: 1fr;\n  }\n}',
    requiredElements: ['.footer', 'display', 'grid', 'grid-template-columns', 'repeat', '4', '1fr', '@media', 'max-width', '768px', '2', '480px']
  },
  {
    level: 6,
    title: 'レスポンシブヒーローセクション',
    description: '画像とテキストのヒーローセクション',
    task: 'ヒーローをPCで横並び(画像50%、テキスト50%)、768px以下で縦並びにしてください。',
    hint: 'Gridで2カラム、モバイルで1カラムに切り替え',
    type: 'css',
    previewHtml: '<section class="hero"><div class="hero-content"><h1>革新的なソリューション</h1><p>私たちは最先端の技術でビジネスを支援します。</p><button>詳しく見る</button></div><div class="hero-image"><img src="https://via.placeholder.com/600x400" alt="Hero"></div></section>',
    previewCss: '.hero { background: #f8f9fa; } .hero-content { padding: 60px 40px; } .hero-content h1 { font-size: 2.5rem; margin-bottom: 20px; } .hero-content p { color: #666; margin-bottom: 30px; } .hero-content button { background: #3498db; color: white; border: none; padding: 15px 30px; font-size: 1rem; cursor: pointer; } .hero-image img { width: 100%; height: 100%; object-fit: cover; }',
    answer: '.hero {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  align-items: center;\n}\n\n@media (max-width: 768px) {\n  .hero {\n    grid-template-columns: 1fr;\n  }\n  .hero-content {\n    order: 2;\n  }\n  .hero-image {\n    order: 1;\n  }\n}',
    requiredElements: ['.hero', 'display', 'grid', 'grid-template-columns', '1fr', 'align-items', 'center', '@media', 'max-width', '768px', 'order']
  },
  {
    level: 6,
    title: 'レスポンシブサイドバーレイアウト',
    description: 'サイドバー付きレイアウトのレスポンシブ',
    task: 'メイン(3fr)とサイドバー(1fr)の横並びレイアウトを、992px以下で縦並びにしてください。',
    hint: 'grid-template-columnsで比率を設定し、モバイルで1frに',
    type: 'css',
    previewHtml: '<div class="layout"><main class="main-content"><h2>メインコンテンツ</h2><p>ここにメインの内容が入ります。記事やコンテンツがここに表示されます。</p></main><aside class="sidebar"><h3>サイドバー</h3><ul><li>カテゴリ1</li><li>カテゴリ2</li><li>カテゴリ3</li></ul></aside></div>',
    previewCss: '.main-content { background: white; padding: 30px; border-radius: 8px; } .sidebar { background: #ecf0f1; padding: 20px; border-radius: 8px; } .sidebar ul { list-style: none; padding: 0; } .sidebar li { padding: 8px 0; border-bottom: 1px solid #ddd; }',
    answer: '.layout {\n  display: grid;\n  grid-template-columns: 3fr 1fr;\n  gap: 30px;\n}\n\n@media (max-width: 992px) {\n  .layout {\n    grid-template-columns: 1fr;\n  }\n}',
    requiredElements: ['.layout', 'display', 'grid', 'grid-template-columns', '3fr', '1fr', 'gap', '@media', 'max-width', '992px']
  },
  {
    level: 6,
    title: 'モバイルナビゲーション',
    description: 'ハンバーガーメニュー用のCSS',
    task: 'PCでnavを表示、768px以下でnon表示、.menu-btnを表示させてください。モバイルで.nav.activeは表示します。',
    hint: '.menu-btnはPCで非表示、モバイルで表示。navはその逆',
    type: 'css',
    previewHtml: '<header class="header"><div class="logo">Logo</div><button class="menu-btn">☰</button><nav class="nav active"><a href="#">ホーム</a><a href="#">サービス</a><a href="#">会社概要</a><a href="#">お問い合わせ</a></nav></header>',
    previewCss: '.header { display: flex; justify-content: space-between; align-items: center; padding: 15px 30px; background: #34495e; flex-wrap: wrap; } .logo { color: white; font-size: 24px; font-weight: bold; } .menu-btn { background: none; border: none; color: white; font-size: 24px; cursor: pointer; } .nav a { color: white; text-decoration: none; padding: 10px 15px; display: block; }',
    answer: '.menu-btn {\n  display: none;\n}\n\n.nav {\n  display: flex;\n}\n\n@media (max-width: 768px) {\n  .menu-btn {\n    display: block;\n  }\n  .nav {\n    display: none;\n    width: 100%;\n    flex-direction: column;\n    background: #2c3e50;\n    margin-top: 15px;\n  }\n  .nav.active {\n    display: flex;\n  }\n}',
    requiredElements: ['.menu-btn', 'display', 'none', 'block', '.nav', 'flex', '@media', 'max-width', '768px', 'width', '100%', 'flex-direction', 'column', '.nav.active']
  }
];

// 実践プロジェクト問題 (HTML+CSS+JS統合)
const projectExercises = [
  // Level 1: 入門
  {
    level: 1,
    title: 'プロフィールカード',
    description: 'HTMLとCSSでプロフィールカードを作成',
    task: '名前、職業、自己紹介を含むプロフィールカードのHTMLを完成させてください。',
    hint: 'div.cardの中にimg、h2、p要素を配置します',
    type: 'html',
    previewCss: '.card { max-width: 300px; background: white; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; text-align: center; } .card img { width: 100%; height: 200px; object-fit: cover; } .card-body { padding: 20px; } .card h2 { margin: 0 0 5px; color: #333; } .card .job { color: #3498db; margin-bottom: 15px; } .card p { color: #666; font-size: 14px; line-height: 1.6; }',
    answer: '<div class="card">\n  <img src="https://via.placeholder.com/300x200" alt="プロフィール画像">\n  <div class="card-body">\n    <h2>山田太郎</h2>\n    <p class="job">Webデザイナー</p>\n    <p>5年の経験を持つWebデザイナーです。ユーザー体験を重視したデザインを心がけています。</p>\n  </div>\n</div>',
    requiredElements: ['<div', 'class="card"', '<img', '<h2>', '</h2>', '<p', '</p>', '</div>']
  },
  {
    level: 1,
    title: 'シンプルなボタンコンポーネント',
    description: 'CSSでボタンスタイルを作成',
    task: '.btnクラスにパディング、背景色、角丸、ホバー効果を設定してください。',
    hint: 'padding, background, border-radius, transitionを設定し、:hoverで色を変更',
    type: 'css',
    previewHtml: '<button class="btn">クリック</button><button class="btn">送信</button><button class="btn">詳細を見る</button>',
    previewCss: '.btn { border: none; color: white; cursor: pointer; margin: 5px; font-size: 16px; }',
    answer: '.btn {\n  padding: 12px 24px;\n  background: #3498db;\n  border-radius: 8px;\n  transition: background 0.3s;\n}\n\n.btn:hover {\n  background: #2980b9;\n}',
    requiredElements: ['.btn', 'padding', 'background', 'border-radius', 'transition', ':hover']
  },
  {
    level: 1,
    title: 'アラートメッセージ',
    description: '4種類のアラートスタイルを作成',
    task: '.alert-success(緑)、.alert-error(赤)、.alert-warning(黄)、.alert-info(青)のスタイルを作成してください。',
    hint: '各クラスでbackgroundとborder-leftの色を変えます',
    type: 'css',
    previewHtml: '<div class="alert alert-success">成功しました！</div><div class="alert alert-error">エラーが発生しました</div><div class="alert alert-warning">注意してください</div><div class="alert alert-info">お知らせです</div>',
    previewCss: '.alert { padding: 15px 20px; margin: 10px 0; border-radius: 5px; border-left: 4px solid; }',
    answer: '.alert-success {\n  background: #d4edda;\n  border-left-color: #28a745;\n  color: #155724;\n}\n\n.alert-error {\n  background: #f8d7da;\n  border-left-color: #dc3545;\n  color: #721c24;\n}\n\n.alert-warning {\n  background: #fff3cd;\n  border-left-color: #ffc107;\n  color: #856404;\n}\n\n.alert-info {\n  background: #d1ecf1;\n  border-left-color: #17a2b8;\n  color: #0c5460;\n}',
    requiredElements: ['.alert-success', '.alert-error', '.alert-warning', '.alert-info', 'background', 'border-left-color', 'color']
  },
  {
    level: 1,
    title: 'ナビゲーションバー',
    description: 'シンプルなナビゲーションを作成',
    task: 'ヘッダーナビゲーションのHTMLを作成してください。ロゴとリンク4つを含めます。',
    hint: 'header内にロゴ(div.logo)とnav > ul > liでリンクを配置',
    type: 'html',
    previewCss: 'header { display: flex; justify-content: space-between; align-items: center; padding: 15px 30px; background: #2c3e50; } .logo { color: white; font-size: 24px; font-weight: bold; } nav ul { display: flex; list-style: none; margin: 0; padding: 0; gap: 20px; } nav a { color: white; text-decoration: none; padding: 8px 15px; border-radius: 5px; transition: background 0.3s; } nav a:hover { background: rgba(255,255,255,0.1); }',
    answer: '<header>\n  <div class="logo">MyBrand</div>\n  <nav>\n    <ul>\n      <li><a href="#">ホーム</a></li>\n      <li><a href="#">サービス</a></li>\n      <li><a href="#">会社概要</a></li>\n      <li><a href="#">お問い合わせ</a></li>\n    </ul>\n  </nav>\n</header>',
    requiredElements: ['<header>', '<div', 'class="logo"', '<nav>', '<ul>', '<li>', '<a', 'href', '</header>']
  },
  // Level 2: 初級
  {
    level: 2,
    title: '価格カード',
    description: '料金プランカードを作成',
    task: 'プラン名、価格、機能リスト、ボタンを含む価格カードのHTMLを作成してください。',
    hint: 'div.pricing-card内にh3(プラン名)、.price、ul(機能)、buttonを配置',
    type: 'html',
    previewCss: '.pricing-card { background: white; border-radius: 10px; padding: 30px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 300px; } .pricing-card h3 { color: #333; margin-bottom: 10px; } .price { font-size: 48px; font-weight: bold; color: #3498db; margin: 20px 0; } .price span { font-size: 16px; color: #666; } .pricing-card ul { list-style: none; padding: 0; margin: 20px 0; text-align: left; } .pricing-card li { padding: 10px 0; border-bottom: 1px solid #eee; color: #666; } .pricing-card button { width: 100%; padding: 15px; background: #3498db; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }',
    answer: '<div class="pricing-card">\n  <h3>スタンダード</h3>\n  <div class="price">¥2,980<span>/月</span></div>\n  <ul>\n    <li>機能1: 無制限アクセス</li>\n    <li>機能2: 24時間サポート</li>\n    <li>機能3: クラウド保存</li>\n    <li>機能4: API連携</li>\n  </ul>\n  <button>申し込む</button>\n</div>',
    requiredElements: ['<div', 'class="pricing-card"', '<h3>', '</h3>', '<div class="price">', '<ul>', '<li>', '</li>', '<button>', '</button>']
  },
  {
    level: 2,
    title: 'お問い合わせフォーム',
    description: '入力フォームのスタイリング',
    task: 'input、textarea、buttonにスタイルを適用し、フォーカス時のスタイルも設定してください。',
    hint: 'padding、border、border-radiusを設定し、:focusでborder-colorを変更',
    type: 'css',
    previewHtml: '<form class="contact-form"><div class="form-group"><label>お名前</label><input type="text" placeholder="山田太郎"></div><div class="form-group"><label>メール</label><input type="email" placeholder="email@example.com"></div><div class="form-group"><label>メッセージ</label><textarea placeholder="お問い合わせ内容"></textarea></div><button type="submit">送信</button></form>',
    previewCss: '.contact-form { max-width: 400px; } .form-group { margin-bottom: 20px; } label { display: block; margin-bottom: 8px; color: #333; font-weight: bold; }',
    answer: 'input, textarea {\n  width: 100%;\n  padding: 12px;\n  border: 2px solid #ddd;\n  border-radius: 8px;\n  font-size: 16px;\n  box-sizing: border-box;\n  transition: border-color 0.3s;\n}\n\ninput:focus, textarea:focus {\n  border-color: #3498db;\n  outline: none;\n}\n\ntextarea {\n  min-height: 120px;\n  resize: vertical;\n}\n\nbutton {\n  width: 100%;\n  padding: 15px;\n  background: #3498db;\n  color: white;\n  border: none;\n  border-radius: 8px;\n  font-size: 16px;\n  cursor: pointer;\n}',
    requiredElements: ['input', 'textarea', 'padding', 'border', 'border-radius', ':focus', 'border-color', 'button']
  },
  {
    level: 2,
    title: 'フッターセクション',
    description: '4カラムフッターを作成',
    task: '4つのカラム（会社情報、サービス、サポート、SNS）を持つフッターのHTMLを作成してください。',
    hint: 'footer内にdiv.footer-gridを置き、4つのdiv.footer-colを配置',
    type: 'html',
    previewCss: 'footer { background: #2c3e50; padding: 50px 30px 30px; color: white; } .footer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; max-width: 1200px; margin: 0 auto; } .footer-col h4 { margin-bottom: 20px; font-size: 18px; } .footer-col ul { list-style: none; padding: 0; margin: 0; } .footer-col li { margin-bottom: 10px; } .footer-col a { color: #bdc3c7; text-decoration: none; } .footer-col a:hover { color: white; } .copyright { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #34495e; color: #95a5a6; }',
    answer: '<footer>\n  <div class="footer-grid">\n    <div class="footer-col">\n      <h4>会社情報</h4>\n      <ul>\n        <li><a href="#">会社概要</a></li>\n        <li><a href="#">アクセス</a></li>\n        <li><a href="#">採用情報</a></li>\n      </ul>\n    </div>\n    <div class="footer-col">\n      <h4>サービス</h4>\n      <ul>\n        <li><a href="#">Web制作</a></li>\n        <li><a href="#">アプリ開発</a></li>\n        <li><a href="#">コンサルティング</a></li>\n      </ul>\n    </div>\n    <div class="footer-col">\n      <h4>サポート</h4>\n      <ul>\n        <li><a href="#">FAQ</a></li>\n        <li><a href="#">お問い合わせ</a></li>\n        <li><a href="#">利用規約</a></li>\n      </ul>\n    </div>\n    <div class="footer-col">\n      <h4>SNS</h4>\n      <ul>\n        <li><a href="#">Twitter</a></li>\n        <li><a href="#">Facebook</a></li>\n        <li><a href="#">Instagram</a></li>\n      </ul>\n    </div>\n  </div>\n  <p class="copyright">&copy; 2026 Company Name</p>\n</footer>',
    requiredElements: ['<footer>', '<div', 'footer-grid', 'footer-col', '<h4>', '<ul>', '<li>', '<a', 'href', 'copyright']
  },
  {
    level: 2,
    title: 'テスティモニアルカード',
    description: 'お客様の声カードを作成',
    task: '顔写真、コメント、名前、役職を含むテスティモニアルカードのCSSを完成させてください。',
    hint: 'カードに背景色、影、角丸を設定。引用符を疑似要素で追加',
    type: 'css',
    previewHtml: '<div class="testimonial"><img src="https://via.placeholder.com/80" alt="顧客" class="avatar"><p class="quote">このサービスは本当に素晴らしい！業務効率が大幅に改善しました。チーム全員が満足しています。</p><div class="author"><strong>鈴木一郎</strong><span>株式会社ABC 代表取締役</span></div></div>',
    previewCss: '',
    answer: '.testimonial {\n  background: white;\n  padding: 30px;\n  border-radius: 15px;\n  box-shadow: 0 4px 20px rgba(0,0,0,0.1);\n  max-width: 400px;\n  text-align: center;\n}\n\n.avatar {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n  margin-bottom: 20px;\n}\n\n.quote {\n  color: #555;\n  font-style: italic;\n  line-height: 1.8;\n  margin-bottom: 20px;\n}\n\n.author strong {\n  display: block;\n  color: #333;\n  margin-bottom: 5px;\n}\n\n.author span {\n  color: #888;\n  font-size: 14px;\n}',
    requiredElements: ['.testimonial', 'background', 'border-radius', 'box-shadow', '.avatar', 'border-radius', '.quote', '.author']
  },
  // Level 3: 中級
  {
    level: 3,
    title: 'タブコンポーネント',
    description: 'JSでタブ切り替えを実装',
    task: 'タブボタンをクリックすると対応するコンテンツが表示されるようにしてください。',
    hint: 'クリックで全タブからactiveを削除し、クリックしたタブとコンテンツにactiveを追加',
    type: 'dom',
    previewHtml: '<div class="tabs"><div class="tab-buttons"><button class="tab-btn active" data-tab="tab1">タブ1</button><button class="tab-btn" data-tab="tab2">タブ2</button><button class="tab-btn" data-tab="tab3">タブ3</button></div><div class="tab-contents"><div class="tab-content active" id="tab1"><h3>タブ1の内容</h3><p>これはタブ1のコンテンツです。</p></div><div class="tab-content" id="tab2"><h3>タブ2の内容</h3><p>これはタブ2のコンテンツです。</p></div><div class="tab-content" id="tab3"><h3>タブ3の内容</h3><p>これはタブ3のコンテンツです。</p></div></div></div>',
    previewCss: '.tabs { max-width: 500px; } .tab-buttons { display: flex; border-bottom: 2px solid #ddd; } .tab-btn { padding: 15px 25px; border: none; background: none; cursor: pointer; font-size: 16px; color: #666; transition: all 0.3s; } .tab-btn.active { color: #3498db; border-bottom: 2px solid #3498db; margin-bottom: -2px; } .tab-content { display: none; padding: 20px; } .tab-content.active { display: block; }',
    starter: 'const tabBtns = document.querySelectorAll(".tab-btn");\nconst tabContents = document.querySelectorAll(".tab-content");',
    answer: 'const tabBtns = document.querySelectorAll(".tab-btn");\nconst tabContents = document.querySelectorAll(".tab-content");\n\ntabBtns.forEach(btn => {\n  btn.addEventListener("click", () => {\n    // 全てのタブからactiveを削除\n    tabBtns.forEach(b => b.classList.remove("active"));\n    tabContents.forEach(c => c.classList.remove("active"));\n    \n    // クリックしたタブにactiveを追加\n    btn.classList.add("active");\n    const tabId = btn.dataset.tab;\n    document.querySelector("#" + tabId).classList.add("active");\n  });\n});',
    requiredElements: ['queryselectorall', 'foreach', 'addeventlistener', 'click', 'classlist.remove', 'classlist.add', 'active', 'dataset.tab']
  },
  {
    level: 3,
    title: 'ドロップダウンメニュー',
    description: 'CSSでドロップダウンを実装',
    task: '.nav-itemにホバーすると.dropdownが表示されるCSSを書いてください。',
    hint: '.dropdownを通常は非表示にし、.nav-item:hoverで表示',
    type: 'css',
    previewHtml: '<nav class="main-nav"><ul><li class="nav-item"><a href="#">ホーム</a></li><li class="nav-item has-dropdown"><a href="#">サービス ▼</a><ul class="dropdown"><li><a href="#">Web制作</a></li><li><a href="#">アプリ開発</a></li><li><a href="#">コンサルティング</a></li></ul></li><li class="nav-item"><a href="#">会社概要</a></li><li class="nav-item"><a href="#">お問い合わせ</a></li></ul></nav>',
    previewCss: '.main-nav > ul { display: flex; list-style: none; padding: 0; margin: 0; background: #34495e; } .nav-item { position: relative; } .nav-item > a { display: block; padding: 15px 25px; color: white; text-decoration: none; } .dropdown { position: absolute; top: 100%; left: 0; background: white; list-style: none; padding: 0; margin: 0; min-width: 200px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); } .dropdown li a { display: block; padding: 12px 20px; color: #333; text-decoration: none; } .dropdown li a:hover { background: #f5f5f5; }',
    answer: '.dropdown {\n  display: none;\n}\n\n.nav-item:hover .dropdown {\n  display: block;\n}',
    requiredElements: ['.dropdown', 'display', 'none', '.nav-item:hover', '.dropdown', 'block']
  },
  {
    level: 3,
    title: 'モーダルウィンドウ',
    description: 'JSでモーダルの開閉を実装',
    task: '開くボタンでモーダル表示、閉じるボタンとオーバーレイクリックで非表示にしてください。',
    hint: 'showクラスの追加/削除でモーダルの表示を制御',
    type: 'dom',
    previewHtml: '<button id="openModal" class="btn-open">モーダルを開く</button><div class="modal-overlay" id="modal"><div class="modal-box"><h2>モーダルタイトル</h2><p>モーダルの内容がここに入ります。確認や入力などに使用します。</p><div class="modal-actions"><button id="closeModal">閉じる</button></div></div></div>',
    previewCss: '.btn-open { padding: 15px 30px; background: #3498db; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; } .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); justify-content: center; align-items: center; } .modal-overlay.show { display: flex; } .modal-box { background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; } .modal-box h2 { margin-top: 0; } .modal-actions { margin-top: 20px; text-align: right; } .modal-actions button { padding: 10px 25px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; }',
    starter: 'const openBtn = document.querySelector("#openModal");\nconst closeBtn = document.querySelector("#closeModal");\nconst modal = document.querySelector("#modal");',
    answer: 'const openBtn = document.querySelector("#openModal");\nconst closeBtn = document.querySelector("#closeModal");\nconst modal = document.querySelector("#modal");\n\nopenBtn.addEventListener("click", () => {\n  modal.classList.add("show");\n});\n\ncloseBtn.addEventListener("click", () => {\n  modal.classList.remove("show");\n});\n\nmodal.addEventListener("click", (e) => {\n  if (e.target === modal) {\n    modal.classList.remove("show");\n  }\n});',
    requiredElements: ['addeventlistener', 'click', 'classlist.add', 'classlist.remove', 'show', 'e.target', '===', 'modal']
  },
  {
    level: 3,
    title: 'イメージギャラリー',
    description: 'グリッドレイアウトのギャラリー',
    task: '6枚の画像を3列グリッドで表示するギャラリーのHTMLとCSSを完成させてください。',
    hint: 'display: gridとgrid-template-columns: repeat(3, 1fr)を使用',
    type: 'css',
    previewHtml: '<div class="gallery"><div class="gallery-item"><img src="https://via.placeholder.com/300x200/3498db/fff" alt=""><div class="overlay"><span>画像1</span></div></div><div class="gallery-item"><img src="https://via.placeholder.com/300x200/e74c3c/fff" alt=""><div class="overlay"><span>画像2</span></div></div><div class="gallery-item"><img src="https://via.placeholder.com/300x200/2ecc71/fff" alt=""><div class="overlay"><span>画像3</span></div></div><div class="gallery-item"><img src="https://via.placeholder.com/300x200/f39c12/fff" alt=""><div class="overlay"><span>画像4</span></div></div><div class="gallery-item"><img src="https://via.placeholder.com/300x200/9b59b6/fff" alt=""><div class="overlay"><span>画像5</span></div></div><div class="gallery-item"><img src="https://via.placeholder.com/300x200/1abc9c/fff" alt=""><div class="overlay"><span>画像6</span></div></div></div>',
    previewCss: '.gallery-item { position: relative; overflow: hidden; } .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; } .gallery-item:hover img { transform: scale(1.1); } .overlay { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; padding: 15px; transform: translateY(100%); transition: transform 0.3s; } .gallery-item:hover .overlay { transform: translateY(0); }',
    answer: '.gallery {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 15px;\n}',
    requiredElements: ['.gallery', 'display', 'grid', 'grid-template-columns', 'repeat', '3', '1fr', 'gap']
  },
  // Level 4: 中上級
  {
    level: 4,
    title: 'スライダー/カルーセル',
    description: 'JSでスライダーを実装',
    task: '前へ/次へボタンでスライドが切り替わるカルーセルを実装してください。',
    hint: 'currentIndexを管理し、translateXでスライドを移動',
    type: 'dom',
    previewHtml: '<div class="slider"><div class="slider-track" id="track"><div class="slide" style="background:#3498db">スライド 1</div><div class="slide" style="background:#e74c3c">スライド 2</div><div class="slide" style="background:#2ecc71">スライド 3</div></div><button class="slider-btn prev" id="prevBtn">❮</button><button class="slider-btn next" id="nextBtn">❯</button></div>',
    previewCss: '.slider { position: relative; width: 100%; max-width: 600px; overflow: hidden; } .slider-track { display: flex; transition: transform 0.3s ease; } .slide { min-width: 100%; height: 300px; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; } .slider-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.8); border: none; width: 50px; height: 50px; border-radius: 50%; font-size: 20px; cursor: pointer; } .prev { left: 10px; } .next { right: 10px; }',
    starter: 'const track = document.querySelector("#track");\nconst prevBtn = document.querySelector("#prevBtn");\nconst nextBtn = document.querySelector("#nextBtn");\nlet currentIndex = 0;\nconst totalSlides = 3;',
    answer: 'const track = document.querySelector("#track");\nconst prevBtn = document.querySelector("#prevBtn");\nconst nextBtn = document.querySelector("#nextBtn");\nlet currentIndex = 0;\nconst totalSlides = 3;\n\nfunction updateSlider() {\n  track.style.transform = `translateX(-${currentIndex * 100}%)`;\n}\n\nnextBtn.addEventListener("click", () => {\n  currentIndex = (currentIndex + 1) % totalSlides;\n  updateSlider();\n});\n\nprevBtn.addEventListener("click", () => {\n  currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;\n  updateSlider();\n});',
    requiredElements: ['function', 'transform', 'translatex', 'addeventlistener', 'click', 'currentindex', '%', 'totalslides']
  },
  {
    level: 4,
    title: 'フィルタリングギャラリー',
    description: 'カテゴリ別にフィルタリング',
    task: 'カテゴリボタンをクリックすると、該当するアイテムのみ表示されるフィルターを実装してください。',
    hint: 'data-category属性を比較し、一致しないアイテムにhiddenクラスを追加',
    type: 'dom',
    previewHtml: '<div class="filter-buttons"><button class="filter-btn active" data-filter="all">すべて</button><button class="filter-btn" data-filter="web">Web</button><button class="filter-btn" data-filter="app">アプリ</button><button class="filter-btn" data-filter="design">デザイン</button></div><div class="filter-grid"><div class="filter-item" data-category="web">Web制作1</div><div class="filter-item" data-category="app">アプリ開発1</div><div class="filter-item" data-category="design">デザイン1</div><div class="filter-item" data-category="web">Web制作2</div><div class="filter-item" data-category="app">アプリ開発2</div><div class="filter-item" data-category="design">デザイン2</div></div>',
    previewCss: '.filter-buttons { margin-bottom: 20px; } .filter-btn { padding: 10px 20px; border: none; background: #ecf0f1; margin-right: 10px; cursor: pointer; border-radius: 5px; } .filter-btn.active { background: #3498db; color: white; } .filter-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; } .filter-item { padding: 40px; background: #34495e; color: white; text-align: center; border-radius: 8px; transition: opacity 0.3s; } .filter-item.hidden { display: none; }',
    starter: 'const filterBtns = document.querySelectorAll(".filter-btn");\nconst items = document.querySelectorAll(".filter-item");',
    answer: 'const filterBtns = document.querySelectorAll(".filter-btn");\nconst items = document.querySelectorAll(".filter-item");\n\nfilterBtns.forEach(btn => {\n  btn.addEventListener("click", () => {\n    filterBtns.forEach(b => b.classList.remove("active"));\n    btn.classList.add("active");\n    \n    const filter = btn.dataset.filter;\n    \n    items.forEach(item => {\n      if (filter === "all" || item.dataset.category === filter) {\n        item.classList.remove("hidden");\n      } else {\n        item.classList.add("hidden");\n      }\n    });\n  });\n});',
    requiredElements: ['queryselectorall', 'foreach', 'addeventlistener', 'click', 'dataset.filter', 'dataset.category', 'classlist.remove', 'classlist.add', 'hidden']
  },
  {
    level: 4,
    title: '進捗バー',
    description: 'アニメーション付き進捗バー',
    task: 'ページ読み込み時に進捗バーがアニメーションで伸びるCSSを実装してください。',
    hint: '@keyframesでwidthを0から目標値まで変化させ、animationプロパティで適用',
    type: 'css',
    previewHtml: '<div class="progress-container"><div class="progress-info"><span>HTML</span><span>90%</span></div><div class="progress-bar"><div class="progress-fill" style="--target-width: 90%"></div></div></div><div class="progress-container"><div class="progress-info"><span>CSS</span><span>75%</span></div><div class="progress-bar"><div class="progress-fill" style="--target-width: 75%"></div></div></div><div class="progress-container"><div class="progress-info"><span>JavaScript</span><span>60%</span></div><div class="progress-bar"><div class="progress-fill" style="--target-width: 60%"></div></div></div>',
    previewCss: '.progress-container { margin-bottom: 25px; } .progress-info { display: flex; justify-content: space-between; margin-bottom: 8px; color: #333; } .progress-bar { background: #ecf0f1; border-radius: 10px; height: 15px; overflow: hidden; }',
    answer: '@keyframes fillProgress {\n  from {\n    width: 0;\n  }\n  to {\n    width: var(--target-width);\n  }\n}\n\n.progress-fill {\n  height: 100%;\n  background: linear-gradient(90deg, #3498db, #2ecc71);\n  border-radius: 10px;\n  animation: fillProgress 1.5s ease-out forwards;\n}',
    requiredElements: ['@keyframes', 'fillprogress', 'from', 'width', '0', 'to', 'var(--target-width)', '.progress-fill', 'animation', 'ease-out', 'forwards']
  },
  {
    level: 4,
    title: 'アコーディオンFAQ',
    description: '開閉式のFAQセクション',
    task: '質問をクリックすると回答が開閉するアコーディオンを実装してください。同時に1つだけ開く仕様です。',
    hint: '全ての回答を閉じてから、クリックした質問の回答を開く',
    type: 'dom',
    previewHtml: '<div class="faq"><div class="faq-item"><div class="faq-question">Q. 料金プランについて教えてください</div><div class="faq-answer"><p>月額2,980円からご利用いただけます。年間プランならさらにお得です。</p></div></div><div class="faq-item"><div class="faq-question">Q. 無料トライアルはありますか？</div><div class="faq-answer"><p>はい、14日間の無料トライアルをご用意しています。</p></div></div><div class="faq-item"><div class="faq-question">Q. 解約はいつでもできますか？</div><div class="faq-answer"><p>はい、いつでも解約可能です。違約金もかかりません。</p></div></div></div>',
    previewCss: '.faq { max-width: 600px; } .faq-item { border: 1px solid #ddd; margin-bottom: 10px; border-radius: 8px; overflow: hidden; } .faq-question { padding: 20px; background: #f8f9fa; cursor: pointer; font-weight: bold; display: flex; justify-content: space-between; } .faq-question::after { content: "+"; font-size: 20px; } .faq-item.open .faq-question::after { content: "-"; } .faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; } .faq-item.open .faq-answer { max-height: 200px; } .faq-answer p { padding: 20px; margin: 0; color: #666; }',
    starter: 'const questions = document.querySelectorAll(".faq-question");',
    answer: 'const questions = document.querySelectorAll(".faq-question");\n\nquestions.forEach(question => {\n  question.addEventListener("click", () => {\n    const faqItem = question.parentElement;\n    const isOpen = faqItem.classList.contains("open");\n    \n    // 全て閉じる\n    document.querySelectorAll(".faq-item").forEach(item => {\n      item.classList.remove("open");\n    });\n    \n    // クリックしたものを開く（既に開いていた場合は閉じたまま）\n    if (!isOpen) {\n      faqItem.classList.add("open");\n    }\n  });\n});',
    requiredElements: ['queryselectorall', 'foreach', 'addeventlistener', 'click', 'parentelement', 'classlist.contains', 'open', 'classlist.remove', 'classlist.add']
  },
  // Level 5: 上級
  {
    level: 5,
    title: 'ドラッグ&ドロップリスト',
    description: 'リストアイテムをドラッグで並び替え',
    task: 'ドラッグ&ドロップでリストの順番を変更できる機能を実装してください。',
    hint: 'dragstart, dragover, dropイベントを使用。insertBeforeで要素を移動',
    type: 'dom',
    previewHtml: '<ul class="drag-list" id="dragList"><li class="drag-item" draggable="true">アイテム 1</li><li class="drag-item" draggable="true">アイテム 2</li><li class="drag-item" draggable="true">アイテム 3</li><li class="drag-item" draggable="true">アイテム 4</li><li class="drag-item" draggable="true">アイテム 5</li></ul>',
    previewCss: '.drag-list { list-style: none; padding: 0; max-width: 300px; } .drag-item { padding: 15px 20px; background: #3498db; color: white; margin-bottom: 8px; border-radius: 8px; cursor: grab; transition: opacity 0.3s, transform 0.2s; } .drag-item:active { cursor: grabbing; } .drag-item.dragging { opacity: 0.5; transform: scale(1.02); }',
    starter: 'const list = document.querySelector("#dragList");\nlet draggedItem = null;',
    answer: 'const list = document.querySelector("#dragList");\nlet draggedItem = null;\n\nlist.addEventListener("dragstart", (e) => {\n  draggedItem = e.target;\n  e.target.classList.add("dragging");\n});\n\nlist.addEventListener("dragend", (e) => {\n  e.target.classList.remove("dragging");\n});\n\nlist.addEventListener("dragover", (e) => {\n  e.preventDefault();\n  const afterElement = getDragAfterElement(e.clientY);\n  if (afterElement) {\n    list.insertBefore(draggedItem, afterElement);\n  } else {\n    list.appendChild(draggedItem);\n  }\n});\n\nfunction getDragAfterElement(y) {\n  const elements = [...list.querySelectorAll(".drag-item:not(.dragging)")];\n  return elements.reduce((closest, child) => {\n    const box = child.getBoundingClientRect();\n    const offset = y - box.top - box.height / 2;\n    if (offset < 0 && offset > closest.offset) {\n      return { offset: offset, element: child };\n    }\n    return closest;\n  }, { offset: Number.NEGATIVE_INFINITY }).element;\n}',
    requiredElements: ['dragstart', 'dragend', 'dragover', 'preventdefault', 'insertbefore', 'appendchild', 'getboundingclientrect', 'classlist']
  },
  {
    level: 5,
    title: '無限スクロール',
    description: 'スクロールで自動読み込み',
    task: 'ページ下部までスクロールすると新しいアイテムが自動的に追加される機能を実装してください。',
    hint: 'IntersectionObserverでセンチネル要素を監視',
    type: 'dom',
    previewHtml: '<div class="infinite-scroll" id="container"><div class="item">アイテム 1</div><div class="item">アイテム 2</div><div class="item">アイテム 3</div><div id="sentinel" class="sentinel">読み込み中...</div></div>',
    previewCss: '.infinite-scroll { max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; } .item { padding: 20px; border-bottom: 1px solid #eee; } .sentinel { padding: 20px; text-align: center; color: #888; }',
    starter: 'const container = document.querySelector("#container");\nconst sentinel = document.querySelector("#sentinel");\nlet itemCount = 3;',
    answer: 'const container = document.querySelector("#container");\nconst sentinel = document.querySelector("#sentinel");\nlet itemCount = 3;\n\nconst observer = new IntersectionObserver((entries) => {\n  entries.forEach(entry => {\n    if (entry.isIntersecting) {\n      loadMoreItems();\n    }\n  });\n}, { root: container, threshold: 0.1 });\n\nobserver.observe(sentinel);\n\nfunction loadMoreItems() {\n  for (let i = 0; i < 3; i++) {\n    itemCount++;\n    const item = document.createElement("div");\n    item.className = "item";\n    item.textContent = `アイテム ${itemCount}`;\n    container.insertBefore(item, sentinel);\n  }\n}',
    requiredElements: ['intersectionobserver', 'observe', 'isintersecting', 'createelement', 'classname', 'textcontent', 'insertbefore']
  },
  {
    level: 5,
    title: 'フォームバリデーション',
    description: 'リアルタイムバリデーション',
    task: '入力フィールドにリアルタイムでバリデーションを行い、エラーメッセージを表示してください。',
    hint: 'inputイベントで入力を監視し、正規表現でチェック',
    type: 'dom',
    previewHtml: '<form class="validate-form" id="form"><div class="form-group"><label>メールアドレス</label><input type="text" id="email" placeholder="example@email.com"><span class="error" id="emailError"></span></div><div class="form-group"><label>パスワード（8文字以上）</label><input type="password" id="password" placeholder="パスワード"><span class="error" id="passwordError"></span></div><button type="submit">登録</button></form>',
    previewCss: '.validate-form { max-width: 400px; } .form-group { margin-bottom: 20px; } label { display: block; margin-bottom: 8px; font-weight: bold; } input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; box-sizing: border-box; } input.valid { border-color: #2ecc71; } input.invalid { border-color: #e74c3c; } .error { color: #e74c3c; font-size: 14px; margin-top: 5px; display: block; } button { padding: 15px 30px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; }',
    starter: 'const emailInput = document.querySelector("#email");\nconst passwordInput = document.querySelector("#password");\nconst emailError = document.querySelector("#emailError");\nconst passwordError = document.querySelector("#passwordError");',
    answer: 'const emailInput = document.querySelector("#email");\nconst passwordInput = document.querySelector("#password");\nconst emailError = document.querySelector("#emailError");\nconst passwordError = document.querySelector("#passwordError");\n\nconst emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n\nemailInput.addEventListener("input", () => {\n  if (emailRegex.test(emailInput.value)) {\n    emailInput.classList.remove("invalid");\n    emailInput.classList.add("valid");\n    emailError.textContent = "";\n  } else {\n    emailInput.classList.remove("valid");\n    emailInput.classList.add("invalid");\n    emailError.textContent = "有効なメールアドレスを入力してください";\n  }\n});\n\npasswordInput.addEventListener("input", () => {\n  if (passwordInput.value.length >= 8) {\n    passwordInput.classList.remove("invalid");\n    passwordInput.classList.add("valid");\n    passwordError.textContent = "";\n  } else {\n    passwordInput.classList.remove("valid");\n    passwordInput.classList.add("invalid");\n    passwordError.textContent = "8文字以上で入力してください";\n  }\n});',
    requiredElements: ['addeventlistener', 'input', 'test', 'classlist.add', 'classlist.remove', 'valid', 'invalid', 'textcontent', 'length']
  },
  {
    level: 5,
    title: 'ダークモード切り替え',
    description: 'ダークモードのトグル実装',
    task: 'ボタンクリックでダークモードを切り替え、LocalStorageに設定を保存してください。',
    hint: 'body.darkクラスの切り替えと、localStorageで設定を永続化',
    type: 'dom',
    previewHtml: '<div class="theme-demo"><button id="themeToggle">🌙 ダークモード</button><div class="content"><h2>テーマ切り替えデモ</h2><p>ボタンをクリックしてダークモードを切り替えてみてください。</p></div></div>',
    previewCss: '.theme-demo { padding: 30px; background: white; border-radius: 10px; transition: background 0.3s, color 0.3s; } .theme-demo.dark { background: #1a1a2e; color: #eee; } #themeToggle { padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 20px; } .content { padding: 20px; background: #f5f5f5; border-radius: 8px; } .dark .content { background: #16213e; }',
    starter: 'const toggleBtn = document.querySelector("#themeToggle");\nconst themeDemo = document.querySelector(".theme-demo");',
    answer: 'const toggleBtn = document.querySelector("#themeToggle");\nconst themeDemo = document.querySelector(".theme-demo");\n\n// 保存された設定を読み込み\nif (localStorage.getItem("darkMode") === "true") {\n  themeDemo.classList.add("dark");\n  toggleBtn.textContent = "☀️ ライトモード";\n}\n\ntoggleBtn.addEventListener("click", () => {\n  themeDemo.classList.toggle("dark");\n  \n  const isDark = themeDemo.classList.contains("dark");\n  localStorage.setItem("darkMode", isDark);\n  \n  toggleBtn.textContent = isDark ? "☀️ ライトモード" : "🌙 ダークモード";\n});',
    requiredElements: ['localstorage.getitem', 'localstorage.setitem', 'addeventlistener', 'click', 'classlist.toggle', 'classlist.contains', 'dark', 'textcontent']
  },
  // Level 6: 実践
  {
    level: 6,
    title: 'ランディングページ',
    description: '完成度の高いLPのヒーローセクション',
    task: 'ヒーローセクションにグラデーション背景、中央寄せのテキスト、CTAボタンを配置するCSSを書いてください。',
    hint: 'linear-gradientで背景、flexで中央寄せ、min-heightで高さを確保',
    type: 'css',
    previewHtml: '<section class="hero"><div class="hero-content"><h1>ビジネスを次のレベルへ</h1><p>私たちのサービスで、あなたのビジネスを加速させましょう。</p><button class="cta-button">無料で始める</button></div></section>',
    previewCss: '.hero h1 { font-size: 3rem; margin-bottom: 20px; } .hero p { font-size: 1.2rem; margin-bottom: 30px; opacity: 0.9; } .cta-button { padding: 18px 40px; font-size: 1.1rem; background: white; color: #667eea; border: none; border-radius: 30px; cursor: pointer; font-weight: bold; transition: transform 0.3s, box-shadow 0.3s; } .cta-button:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }',
    answer: '.hero {\n  min-height: 100vh;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: white;\n  text-align: center;\n  padding: 20px;\n}\n\n.hero-content {\n  max-width: 800px;\n}',
    requiredElements: ['.hero', 'min-height', '100vh', 'background', 'linear-gradient', 'display', 'flex', 'align-items', 'center', 'justify-content', 'color', 'white', 'text-align']
  },
  {
    level: 6,
    title: 'ショッピングカート',
    description: '商品追加・削除・合計計算',
    task: '商品の追加、削除、合計金額の自動計算機能を実装してください。',
    hint: '配列で商品を管理し、追加/削除時に再描画と合計計算を行う',
    type: 'dom',
    previewHtml: '<div class="cart-demo"><div class="products"><div class="product" data-name="商品A" data-price="1500"><span>商品A - ¥1,500</span><button class="add-btn">追加</button></div><div class="product" data-name="商品B" data-price="2800"><span>商品B - ¥2,800</span><button class="add-btn">追加</button></div><div class="product" data-name="商品C" data-price="980"><span>商品C - ¥980</span><button class="add-btn">追加</button></div></div><div class="cart"><h3>カート</h3><ul id="cartList"></ul><div class="total">合計: ¥<span id="totalPrice">0</span></div></div></div>',
    previewCss: '.cart-demo { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; } .product { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f5f5f5; margin-bottom: 10px; border-radius: 8px; } .add-btn { padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; } .cart { background: #fff; padding: 20px; border-radius: 8px; border: 2px solid #ddd; } .cart ul { list-style: none; padding: 0; } .cart li { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; } .remove-btn { background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; } .total { margin-top: 20px; font-size: 20px; font-weight: bold; text-align: right; }',
    starter: 'const cartList = document.querySelector("#cartList");\nconst totalPrice = document.querySelector("#totalPrice");\nconst cart = [];',
    answer: 'const cartList = document.querySelector("#cartList");\nconst totalPrice = document.querySelector("#totalPrice");\nconst cart = [];\n\ndocument.querySelectorAll(".add-btn").forEach(btn => {\n  btn.addEventListener("click", () => {\n    const product = btn.parentElement;\n    const name = product.dataset.name;\n    const price = parseInt(product.dataset.price);\n    cart.push({ name, price });\n    renderCart();\n  });\n});\n\nfunction renderCart() {\n  cartList.innerHTML = "";\n  cart.forEach((item, index) => {\n    const li = document.createElement("li");\n    li.innerHTML = `<span>${item.name} - ¥${item.price}</span><button class="remove-btn" data-index="${index}">削除</button>`;\n    cartList.appendChild(li);\n  });\n  \n  document.querySelectorAll(".remove-btn").forEach(btn => {\n    btn.addEventListener("click", () => {\n      cart.splice(btn.dataset.index, 1);\n      renderCart();\n    });\n  });\n  \n  const total = cart.reduce((sum, item) => sum + item.price, 0);\n  totalPrice.textContent = total.toLocaleString();\n}',
    requiredElements: ['queryselectorall', 'addeventlistener', 'click', 'dataset', 'push', 'createelement', 'innerhtml', 'appendchild', 'splice', 'reduce', 'tolocalestring']
  },
  {
    level: 6,
    title: 'コメントシステム',
    description: 'コメント投稿・表示機能',
    task: 'コメントを投稿し、タイムスタンプ付きで表示するシステムを実装してください。',
    hint: 'Dateオブジェクトで時刻を取得し、コメントをリストに追加',
    type: 'dom',
    previewHtml: '<div class="comment-system"><form id="commentForm"><textarea id="commentText" placeholder="コメントを入力..." rows="3"></textarea><button type="submit">投稿</button></form><div class="comments" id="comments"></div></div>',
    previewCss: '.comment-system { max-width: 500px; } #commentForm { margin-bottom: 20px; } textarea { width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 8px; resize: vertical; box-sizing: border-box; } #commentForm button { margin-top: 10px; padding: 12px 25px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; } .comment { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; } .comment-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #666; font-size: 14px; } .comment p { margin: 0; color: #333; }',
    starter: 'const form = document.querySelector("#commentForm");\nconst textarea = document.querySelector("#commentText");\nconst commentsDiv = document.querySelector("#comments");',
    answer: 'const form = document.querySelector("#commentForm");\nconst textarea = document.querySelector("#commentText");\nconst commentsDiv = document.querySelector("#comments");\n\nform.addEventListener("submit", (e) => {\n  e.preventDefault();\n  \n  const text = textarea.value.trim();\n  if (!text) return;\n  \n  const now = new Date();\n  const timestamp = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;\n  \n  const comment = document.createElement("div");\n  comment.className = "comment";\n  comment.innerHTML = `\n    <div class="comment-header">\n      <span>ゲスト</span>\n      <span>${timestamp}</span>\n    </div>\n    <p>${text}</p>\n  `;\n  \n  commentsDiv.insertBefore(comment, commentsDiv.firstChild);\n  textarea.value = "";\n});',
    requiredElements: ['addeventlistener', 'submit', 'preventdefault', 'trim', 'new date', 'getfullyear', 'getmonth', 'gethours', 'getminutes', 'createelement', 'innerhtml', 'insertbefore', 'firstchild']
  },
  {
    level: 6,
    title: 'クイズアプリ',
    description: '4択クイズの実装',
    task: '4択クイズを表示し、正解・不正解を判定してスコアを計算するアプリを実装してください。',
    hint: 'クイズデータを配列で管理し、currentIndexで現在の問題を追跡',
    type: 'dom',
    previewHtml: '<div class="quiz-app"><div class="quiz-header"><span>問題 <span id="currentQ">1</span> / 3</span><span>スコア: <span id="score">0</span></span></div><div class="question" id="question">問題文</div><div class="options" id="options"></div><div class="result" id="result"></div><button id="nextBtn" style="display:none">次の問題</button></div>',
    previewCss: '.quiz-app { max-width: 500px; padding: 30px; background: white; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); } .quiz-header { display: flex; justify-content: space-between; margin-bottom: 20px; color: #666; } .question { font-size: 20px; margin-bottom: 25px; color: #333; } .option { display: block; width: 100%; padding: 15px; margin-bottom: 10px; background: #f5f5f5; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; text-align: left; font-size: 16px; transition: all 0.3s; } .option:hover { background: #e8e8e8; } .option.correct { background: #d4edda; border-color: #28a745; } .option.wrong { background: #f8d7da; border-color: #dc3545; } .result { margin: 20px 0; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; } .result.correct { background: #d4edda; color: #155724; } .result.wrong { background: #f8d7da; color: #721c24; } #nextBtn { padding: 15px 30px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%; }',
    starter: 'const quizData = [\n  { question: "HTMLの正式名称は？", options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"], correct: 0 },\n  { question: "CSSの正式名称は？", options: ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Colorful Style Sheets"], correct: 1 },\n  { question: "JavaScriptの開発者は？", options: ["James Gosling", "Guido van Rossum", "Brendan Eich", "Dennis Ritchie"], correct: 2 }\n];\nlet currentIndex = 0;\nlet score = 0;',
    answer: 'const quizData = [\n  { question: "HTMLの正式名称は？", options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"], correct: 0 },\n  { question: "CSSの正式名称は？", options: ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Colorful Style Sheets"], correct: 1 },\n  { question: "JavaScriptの開発者は？", options: ["James Gosling", "Guido van Rossum", "Brendan Eich", "Dennis Ritchie"], correct: 2 }\n];\nlet currentIndex = 0;\nlet score = 0;\n\nfunction loadQuestion() {\n  const q = quizData[currentIndex];\n  document.querySelector("#question").textContent = q.question;\n  document.querySelector("#currentQ").textContent = currentIndex + 1;\n  document.querySelector("#result").textContent = "";\n  document.querySelector("#result").className = "result";\n  document.querySelector("#nextBtn").style.display = "none";\n  \n  const optionsDiv = document.querySelector("#options");\n  optionsDiv.innerHTML = "";\n  q.options.forEach((opt, i) => {\n    const btn = document.createElement("button");\n    btn.className = "option";\n    btn.textContent = opt;\n    btn.addEventListener("click", () => checkAnswer(i));\n    optionsDiv.appendChild(btn);\n  });\n}\n\nfunction checkAnswer(selected) {\n  const q = quizData[currentIndex];\n  const options = document.querySelectorAll(".option");\n  options.forEach((opt, i) => {\n    opt.disabled = true;\n    if (i === q.correct) opt.classList.add("correct");\n    if (i === selected && i !== q.correct) opt.classList.add("wrong");\n  });\n  \n  const result = document.querySelector("#result");\n  if (selected === q.correct) {\n    score++;\n    document.querySelector("#score").textContent = score;\n    result.textContent = "正解！";\n    result.className = "result correct";\n  } else {\n    result.textContent = "不正解...";\n    result.className = "result wrong";\n  }\n  \n  if (currentIndex < quizData.length - 1) {\n    document.querySelector("#nextBtn").style.display = "block";\n  } else {\n    result.textContent += ` 最終スコア: ${score}/${quizData.length}`;\n  }\n}\n\ndocument.querySelector("#nextBtn").addEventListener("click", () => {\n  currentIndex++;\n  loadQuestion();\n});\n\nloadQuestion();',
    requiredElements: ['function', 'loadquestion', 'textcontent', 'innerhtml', 'createelement', 'addeventlistener', 'click', 'classlist.add', 'correct', 'wrong', 'disabled', 'score']
  },
  {
    level: 6,
    title: 'ポートフォリオレイアウト',
    description: '完成度の高いポートフォリオページ',
    task: 'ヘッダー、スキル、作品一覧、コンタクトを含むポートフォリオのHTMLを作成してください。',
    hint: 'section要素で各セクションを分け、適切なクラスを付与',
    type: 'html',
    previewCss: '* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: sans-serif; } .portfolio-header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 100px 20px; text-align: center; } .portfolio-header h1 { font-size: 3rem; margin-bottom: 10px; } .portfolio-header p { font-size: 1.2rem; opacity: 0.9; } section { padding: 60px 20px; max-width: 1200px; margin: 0 auto; } section h2 { text-align: center; margin-bottom: 40px; font-size: 2rem; color: #333; } .skills-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; } .skill { text-align: center; padding: 30px; background: #f8f9fa; border-radius: 10px; } .skill-icon { font-size: 3rem; margin-bottom: 15px; } .works-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px; } .work-item { border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); } .work-item img { width: 100%; height: 200px; object-fit: cover; } .work-item h3 { padding: 15px; margin: 0; } .contact { text-align: center; background: #f8f9fa; padding: 60px 20px; } .contact-links { display: flex; justify-content: center; gap: 20px; margin-top: 20px; } .contact-links a { padding: 12px 25px; background: #3498db; color: white; text-decoration: none; border-radius: 25px; }',
    answer: '<header class="portfolio-header">\n  <h1>山田 太郎</h1>\n  <p>Webデザイナー / フロントエンドエンジニア</p>\n</header>\n\n<section class="skills">\n  <h2>スキル</h2>\n  <div class="skills-grid">\n    <div class="skill">\n      <div class="skill-icon">🎨</div>\n      <h3>デザイン</h3>\n    </div>\n    <div class="skill">\n      <div class="skill-icon">💻</div>\n      <h3>HTML/CSS</h3>\n    </div>\n    <div class="skill">\n      <div class="skill-icon">⚡</div>\n      <h3>JavaScript</h3>\n    </div>\n    <div class="skill">\n      <div class="skill-icon">🚀</div>\n      <h3>React</h3>\n    </div>\n  </div>\n</section>\n\n<section class="works">\n  <h2>作品一覧</h2>\n  <div class="works-grid">\n    <div class="work-item">\n      <img src="https://via.placeholder.com/400x200/3498db/fff" alt="">\n      <h3>プロジェクト1</h3>\n    </div>\n    <div class="work-item">\n      <img src="https://via.placeholder.com/400x200/e74c3c/fff" alt="">\n      <h3>プロジェクト2</h3>\n    </div>\n    <div class="work-item">\n      <img src="https://via.placeholder.com/400x200/2ecc71/fff" alt="">\n      <h3>プロジェクト3</h3>\n    </div>\n  </div>\n</section>\n\n<section class="contact">\n  <h2>お問い合わせ</h2>\n  <p>お仕事のご依頼・ご相談はこちらから</p>\n  <div class="contact-links">\n    <a href="#">メール</a>\n    <a href="#">Twitter</a>\n    <a href="#">GitHub</a>\n  </div>\n</section>',
    requiredElements: ['<header', 'portfolio-header', '<h1>', '<section', 'skills', 'skills-grid', 'skill', 'works', 'works-grid', 'work-item', '<img', 'contact', 'contact-links', '<a']
  },
  {
    level: 6,
    title: 'ノーティフィケーション',
    description: '通知システムの実装',
    task: '成功・エラー・警告の3種類の通知を表示し、自動で消える通知システムを実装してください。',
    hint: 'createElement で通知を作成し、setTimeoutで自動削除',
    type: 'dom',
    previewHtml: '<div class="notify-demo"><button class="notify-btn success" data-type="success">成功通知</button><button class="notify-btn error" data-type="error">エラー通知</button><button class="notify-btn warning" data-type="warning">警告通知</button><div class="notifications" id="notifications"></div></div>',
    previewCss: '.notify-demo { position: relative; min-height: 200px; } .notify-btn { padding: 12px 24px; border: none; color: white; border-radius: 8px; margin-right: 10px; cursor: pointer; } .notify-btn.success { background: #2ecc71; } .notify-btn.error { background: #e74c3c; } .notify-btn.warning { background: #f39c12; } .notifications { position: absolute; top: 60px; right: 0; width: 300px; } .notification { padding: 15px 20px; border-radius: 8px; margin-bottom: 10px; color: white; display: flex; justify-content: space-between; align-items: center; animation: slideIn 0.3s ease; } @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .notification.success { background: #2ecc71; } .notification.error { background: #e74c3c; } .notification.warning { background: #f39c12; } .close-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; }',
    starter: 'const container = document.querySelector("#notifications");\nconst messages = {\n  success: "操作が完了しました！",\n  error: "エラーが発生しました",\n  warning: "注意が必要です"\n};',
    answer: 'const container = document.querySelector("#notifications");\nconst messages = {\n  success: "操作が完了しました！",\n  error: "エラーが発生しました",\n  warning: "注意が必要です"\n};\n\nfunction showNotification(type) {\n  const notification = document.createElement("div");\n  notification.className = `notification ${type}`;\n  notification.innerHTML = `\n    <span>${messages[type]}</span>\n    <button class="close-btn">×</button>\n  `;\n  \n  container.appendChild(notification);\n  \n  notification.querySelector(".close-btn").addEventListener("click", () => {\n    notification.remove();\n  });\n  \n  setTimeout(() => {\n    if (notification.parentElement) {\n      notification.remove();\n    }\n  }, 3000);\n}\n\ndocument.querySelectorAll(".notify-btn").forEach(btn => {\n  btn.addEventListener("click", () => {\n    showNotification(btn.dataset.type);\n  });\n});',
    requiredElements: ['function', 'shownotification', 'createelement', 'classname', 'innerhtml', 'appendchild', 'addeventlistener', 'click', 'remove', 'settimeout', 'dataset.type']
  }
];

// Web API問題
const apiExercises = [
  // Level 1: 入門
  {
    level: 1,
    title: 'LocalStorageに保存',
    description: 'LocalStorageを使ったデータ保存',
    task: 'ボタンクリックで入力値をLocalStorageに保存してください。',
    hint: 'localStorage.setItem(key, value)でデータを保存します',
    type: 'dom',
    previewHtml: '<div class="storage-demo"><input type="text" id="input" placeholder="保存するテキスト"><button id="saveBtn">保存</button><p id="status"></p></div>',
    previewCss: '.storage-demo { padding: 20px; } input { padding: 10px; width: 200px; margin-right: 10px; } button { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; } #status { margin-top: 15px; color: #27ae60; }',
    starter: 'const input = document.querySelector("#input");\nconst saveBtn = document.querySelector("#saveBtn");\nconst status = document.querySelector("#status");',
    answer: 'const input = document.querySelector("#input");\nconst saveBtn = document.querySelector("#saveBtn");\nconst status = document.querySelector("#status");\n\nsaveBtn.addEventListener("click", () => {\n  const value = input.value;\n  localStorage.setItem("savedText", value);\n  status.textContent = "保存しました: " + value;\n});',
    requiredElements: ['addeventlistener', 'click', 'localstorage.setitem', 'textcontent']
  },
  {
    level: 1,
    title: 'LocalStorageから読み込み',
    description: 'LocalStorageからデータ読み込み',
    task: 'ページ読み込み時にLocalStorageから値を読み込んで表示してください。',
    hint: 'localStorage.getItem(key)でデータを取得します',
    type: 'dom',
    previewHtml: '<div class="storage-demo"><p>保存されたテキスト: <span id="savedValue">なし</span></p><button id="clearBtn">クリア</button></div>',
    previewCss: '.storage-demo { padding: 20px; } button { padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; }',
    starter: 'const savedValue = document.querySelector("#savedValue");\nconst clearBtn = document.querySelector("#clearBtn");',
    answer: 'const savedValue = document.querySelector("#savedValue");\nconst clearBtn = document.querySelector("#clearBtn");\n\nconst stored = localStorage.getItem("savedText");\nif (stored) {\n  savedValue.textContent = stored;\n}\n\nclearBtn.addEventListener("click", () => {\n  localStorage.removeItem("savedText");\n  savedValue.textContent = "なし";\n});',
    requiredElements: ['localstorage.getitem', 'textcontent', 'addeventlistener', 'localstorage.removeitem']
  },
  {
    level: 1,
    title: 'JSON.stringify',
    description: 'オブジェクトをJSONに変換',
    task: 'オブジェクトをJSON文字列に変換して表示してください。',
    hint: 'JSON.stringify()でオブジェクトを文字列に変換',
    type: 'js',
    previewHtml: '<div id="output"></div>',
    previewCss: '#output { padding: 20px; background: #f5f5f5; border-radius: 8px; font-family: monospace; white-space: pre-wrap; }',
    starter: 'const user = {\n  name: "田中太郎",\n  age: 30,\n  skills: ["HTML", "CSS", "JavaScript"]\n};\n\n// userをJSON文字列に変換して表示',
    answer: 'const user = {\n  name: "田中太郎",\n  age: 30,\n  skills: ["HTML", "CSS", "JavaScript"]\n};\n\nconst jsonString = JSON.stringify(user, null, 2);\nconsole.log(jsonString);',
    requiredElements: ['json.stringify', 'console.log']
  },
  {
    level: 1,
    title: 'JSON.parse',
    description: 'JSON文字列をオブジェクトに変換',
    task: 'JSON文字列をオブジェクトに変換してプロパティにアクセスしてください。',
    hint: 'JSON.parse()でJSON文字列をオブジェクトに変換',
    type: 'js',
    previewHtml: '<div id="output"></div>',
    previewCss: '#output { padding: 20px; background: #f5f5f5; border-radius: 8px; }',
    starter: 'const jsonString = \'{"name":"山田花子","age":25,"city":"東京"}\';\n\n// jsonStringをオブジェクトに変換して名前を表示',
    answer: 'const jsonString = \'{"name":"山田花子","age":25,"city":"東京"}\';\n\nconst obj = JSON.parse(jsonString);\nconsole.log(obj.name);',
    requiredElements: ['json.parse', 'console.log']
  },
  // Level 2: 初級
  {
    level: 2,
    title: 'setTimeoutの使用',
    description: '遅延実行の基本',
    task: 'ボタンクリック3秒後にメッセージを表示してください。',
    hint: 'setTimeout(関数, ミリ秒)で遅延実行',
    type: 'dom',
    previewHtml: '<button id="delayBtn">3秒後にメッセージ</button><p id="message"></p>',
    previewCss: 'button { padding: 15px 30px; background: #9b59b6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; } #message { margin-top: 20px; font-size: 20px; color: #27ae60; }',
    starter: 'const btn = document.querySelector("#delayBtn");\nconst message = document.querySelector("#message");',
    answer: 'const btn = document.querySelector("#delayBtn");\nconst message = document.querySelector("#message");\n\nbtn.addEventListener("click", () => {\n  message.textContent = "待機中...";\n  setTimeout(() => {\n    message.textContent = "3秒経過しました！";\n  }, 3000);\n});',
    requiredElements: ['addeventlistener', 'click', 'settimeout', '3000', 'textcontent']
  },
  {
    level: 2,
    title: 'setIntervalの使用',
    description: '繰り返し実行の基本',
    task: '1秒ごとにカウントアップするタイマーを実装してください。停止ボタンも作成します。',
    hint: 'setIntervalで繰り返し、clearIntervalで停止',
    type: 'dom',
    previewHtml: '<div class="timer-demo"><p id="count">0</p><button id="startBtn">開始</button><button id="stopBtn">停止</button></div>',
    previewCss: '.timer-demo { text-align: center; } #count { font-size: 48px; font-weight: bold; color: #3498db; } button { padding: 10px 25px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; } #startBtn { background: #27ae60; color: white; } #stopBtn { background: #e74c3c; color: white; }',
    starter: 'const countEl = document.querySelector("#count");\nconst startBtn = document.querySelector("#startBtn");\nconst stopBtn = document.querySelector("#stopBtn");\nlet count = 0;\nlet timerId = null;',
    answer: 'const countEl = document.querySelector("#count");\nconst startBtn = document.querySelector("#startBtn");\nconst stopBtn = document.querySelector("#stopBtn");\nlet count = 0;\nlet timerId = null;\n\nstartBtn.addEventListener("click", () => {\n  if (timerId) return;\n  timerId = setInterval(() => {\n    count++;\n    countEl.textContent = count;\n  }, 1000);\n});\n\nstopBtn.addEventListener("click", () => {\n  clearInterval(timerId);\n  timerId = null;\n});',
    requiredElements: ['addeventlistener', 'setinterval', 'clearinterval', '1000', 'textcontent']
  },
  {
    level: 2,
    title: 'Dateオブジェクト',
    description: '現在時刻の取得と表示',
    task: '現在の日時をフォーマットして表示してください。',
    hint: 'new Date()で現在時刻を取得、各メソッドで年月日時分秒を取得',
    type: 'dom',
    previewHtml: '<div class="datetime"><p id="datetime"></p><button id="updateBtn">更新</button></div>',
    previewCss: '.datetime { text-align: center; padding: 20px; } #datetime { font-size: 24px; margin-bottom: 20px; color: #333; } button { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; }',
    starter: 'const datetimeEl = document.querySelector("#datetime");\nconst updateBtn = document.querySelector("#updateBtn");\n\nfunction updateTime() {\n  // 現在時刻を取得してフォーマット\n}\n\nupdateTime();',
    answer: 'const datetimeEl = document.querySelector("#datetime");\nconst updateBtn = document.querySelector("#updateBtn");\n\nfunction updateTime() {\n  const now = new Date();\n  const year = now.getFullYear();\n  const month = now.getMonth() + 1;\n  const day = now.getDate();\n  const hours = now.getHours();\n  const minutes = String(now.getMinutes()).padStart(2, "0");\n  const seconds = String(now.getSeconds()).padStart(2, "0");\n  \n  datetimeEl.textContent = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;\n}\n\nupdateTime();\nupdateBtn.addEventListener("click", updateTime);',
    requiredElements: ['new date', 'getfullyear', 'getmonth', 'getdate', 'gethours', 'getminutes', 'getseconds', 'textcontent']
  },
  {
    level: 2,
    title: 'オブジェクトのLocalStorage保存',
    description: 'JSONを使ったオブジェクト保存',
    task: 'フォーム入力をオブジェクトとしてLocalStorageに保存・読み込みしてください。',
    hint: 'JSON.stringifyで保存、JSON.parseで読み込み',
    type: 'dom',
    previewHtml: '<form id="userForm"><input type="text" id="name" placeholder="名前"><input type="email" id="email" placeholder="メール"><button type="submit">保存</button></form><div id="savedData"></div>',
    previewCss: 'form { margin-bottom: 20px; } input { display: block; width: 200px; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; } button { padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; } #savedData { padding: 15px; background: #f5f5f5; border-radius: 8px; }',
    starter: 'const form = document.querySelector("#userForm");\nconst nameInput = document.querySelector("#name");\nconst emailInput = document.querySelector("#email");\nconst savedData = document.querySelector("#savedData");',
    answer: 'const form = document.querySelector("#userForm");\nconst nameInput = document.querySelector("#name");\nconst emailInput = document.querySelector("#email");\nconst savedData = document.querySelector("#savedData");\n\n// 保存されたデータを読み込み\nconst stored = localStorage.getItem("userData");\nif (stored) {\n  const user = JSON.parse(stored);\n  savedData.textContent = `保存済み: ${user.name} (${user.email})`;\n}\n\nform.addEventListener("submit", (e) => {\n  e.preventDefault();\n  const user = {\n    name: nameInput.value,\n    email: emailInput.value\n  };\n  localStorage.setItem("userData", JSON.stringify(user));\n  savedData.textContent = `保存しました: ${user.name} (${user.email})`;\n});',
    requiredElements: ['localstorage.getitem', 'json.parse', 'addeventlistener', 'submit', 'preventdefault', 'json.stringify', 'localstorage.setitem']
  },
  // Level 3: 中級
  {
    level: 3,
    title: 'Fetch APIの基本',
    description: 'fetchでJSONを取得',
    task: 'ボタンクリックでJSONPlaceholderからデータを取得して表示してください。',
    hint: 'fetch(url).then(res => res.json()).then(data => ...)の形式',
    type: 'dom',
    previewHtml: '<button id="fetchBtn">データを取得</button><div id="result"></div>',
    previewCss: 'button { padding: 15px 30px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-bottom: 20px; } #result { padding: 20px; background: #f5f5f5; border-radius: 8px; min-height: 100px; }',
    starter: 'const fetchBtn = document.querySelector("#fetchBtn");\nconst result = document.querySelector("#result");',
    answer: 'const fetchBtn = document.querySelector("#fetchBtn");\nconst result = document.querySelector("#result");\n\nfetchBtn.addEventListener("click", () => {\n  result.textContent = "読み込み中...";\n  \n  fetch("https://jsonplaceholder.typicode.com/users/1")\n    .then(response => response.json())\n    .then(data => {\n      result.innerHTML = `\n        <strong>名前:</strong> ${data.name}<br>\n        <strong>メール:</strong> ${data.email}<br>\n        <strong>会社:</strong> ${data.company.name}\n      `;\n    })\n    .catch(error => {\n      result.textContent = "エラー: " + error.message;\n    });\n});',
    requiredElements: ['addeventlistener', 'fetch', '.then', 'response.json', 'innerhtml', '.catch']
  },
  {
    level: 3,
    title: 'async/awaitの使用',
    description: 'async/awaitでfetchを実装',
    task: 'async/awaitを使ってユーザー一覧を取得してください。',
    hint: 'async関数内でawait fetch()を使用',
    type: 'dom',
    previewHtml: '<button id="loadBtn">ユーザー一覧を取得</button><ul id="userList"></ul>',
    previewCss: 'button { padding: 15px 30px; background: #9b59b6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-bottom: 20px; } ul { list-style: none; padding: 0; } li { padding: 10px; background: #ecf0f1; margin-bottom: 5px; border-radius: 5px; }',
    starter: 'const loadBtn = document.querySelector("#loadBtn");\nconst userList = document.querySelector("#userList");',
    answer: 'const loadBtn = document.querySelector("#loadBtn");\nconst userList = document.querySelector("#userList");\n\nasync function loadUsers() {\n  try {\n    userList.innerHTML = "<li>読み込み中...</li>";\n    \n    const response = await fetch("https://jsonplaceholder.typicode.com/users");\n    const users = await response.json();\n    \n    userList.innerHTML = "";\n    users.slice(0, 5).forEach(user => {\n      const li = document.createElement("li");\n      li.textContent = `${user.name} (${user.email})`;\n      userList.appendChild(li);\n    });\n  } catch (error) {\n    userList.innerHTML = `<li>エラー: ${error.message}</li>`;\n  }\n}\n\nloadBtn.addEventListener("click", loadUsers);',
    requiredElements: ['async', 'await', 'fetch', 'response.json', 'try', 'catch', 'createelement', 'appendchild']
  },
  {
    level: 3,
    title: 'URLSearchParams',
    description: 'クエリパラメータの操作',
    task: 'URLSearchParamsを使ってクエリ文字列を作成・解析してください。',
    hint: 'new URLSearchParams()でパラメータを操作',
    type: 'js',
    previewHtml: '<div id="output"></div>',
    previewCss: '#output { padding: 20px; background: #f5f5f5; border-radius: 8px; white-space: pre-wrap; font-family: monospace; }',
    starter: '// URLSearchParamsでクエリ文字列を作成\nconst params = new URLSearchParams();\n\n// 「page=1」「sort=name」「order=asc」を追加\n// 完成したクエリ文字列を出力',
    answer: 'const params = new URLSearchParams();\n\nparams.append("page", "1");\nparams.append("sort", "name");\nparams.append("order", "asc");\n\nconsole.log(params.toString());\nconsole.log("pageの値:", params.get("page"));',
    requiredElements: ['new urlsearchparams', 'append', 'tostring', 'get', 'console.log']
  },
  {
    level: 3,
    title: 'ローカルストレージ配列',
    description: '配列データの保存・管理',
    task: 'ToDoアイテムを配列としてLocalStorageに保存・管理してください。',
    hint: 'JSON.stringify/parseで配列を保存・読み込み',
    type: 'dom',
    previewHtml: '<input type="text" id="todoInput" placeholder="新しいタスク"><button id="addBtn">追加</button><ul id="todoList"></ul>',
    previewCss: 'input { padding: 10px; width: 200px; margin-right: 10px; } button { padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; } ul { list-style: none; padding: 0; margin-top: 20px; } li { padding: 10px; background: #ecf0f1; margin-bottom: 5px; border-radius: 5px; display: flex; justify-content: space-between; } .delete { color: red; cursor: pointer; }',
    starter: 'const input = document.querySelector("#todoInput");\nconst addBtn = document.querySelector("#addBtn");\nconst list = document.querySelector("#todoList");\nlet todos = JSON.parse(localStorage.getItem("todos") || "[]");',
    answer: 'const input = document.querySelector("#todoInput");\nconst addBtn = document.querySelector("#addBtn");\nconst list = document.querySelector("#todoList");\nlet todos = JSON.parse(localStorage.getItem("todos") || "[]");\n\nfunction renderTodos() {\n  list.innerHTML = "";\n  todos.forEach((todo, index) => {\n    const li = document.createElement("li");\n    li.innerHTML = `${todo} <span class="delete" data-index="${index}">×</span>`;\n    list.appendChild(li);\n  });\n}\n\nfunction saveTodos() {\n  localStorage.setItem("todos", JSON.stringify(todos));\n}\n\naddBtn.addEventListener("click", () => {\n  if (!input.value.trim()) return;\n  todos.push(input.value);\n  saveTodos();\n  renderTodos();\n  input.value = "";\n});\n\nlist.addEventListener("click", (e) => {\n  if (e.target.classList.contains("delete")) {\n    todos.splice(e.target.dataset.index, 1);\n    saveTodos();\n    renderTodos();\n  }\n});\n\nrenderTodos();',
    requiredElements: ['json.parse', 'localstorage.getitem', 'json.stringify', 'localstorage.setitem', 'createelement', 'appendchild', 'push', 'splice']
  },
  // Level 4: 中上級
  {
    level: 4,
    title: 'POSTリクエスト',
    description: 'fetchでデータを送信',
    task: 'フォームデータをPOSTリクエストで送信してください。',
    hint: 'fetch第2引数にmethod, headers, bodyを指定',
    type: 'dom',
    previewHtml: '<form id="postForm"><input type="text" id="title" placeholder="タイトル"><textarea id="body" placeholder="本文"></textarea><button type="submit">送信</button></form><div id="response"></div>',
    previewCss: 'form { margin-bottom: 20px; } input, textarea { display: block; width: 300px; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; } textarea { height: 100px; } button { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; } #response { padding: 15px; background: #f5f5f5; border-radius: 8px; }',
    starter: 'const form = document.querySelector("#postForm");\nconst titleInput = document.querySelector("#title");\nconst bodyInput = document.querySelector("#body");\nconst response = document.querySelector("#response");',
    answer: 'const form = document.querySelector("#postForm");\nconst titleInput = document.querySelector("#title");\nconst bodyInput = document.querySelector("#body");\nconst response = document.querySelector("#response");\n\nform.addEventListener("submit", async (e) => {\n  e.preventDefault();\n  response.textContent = "送信中...";\n  \n  try {\n    const res = await fetch("https://jsonplaceholder.typicode.com/posts", {\n      method: "POST",\n      headers: {\n        "Content-Type": "application/json"\n      },\n      body: JSON.stringify({\n        title: titleInput.value,\n        body: bodyInput.value,\n        userId: 1\n      })\n    });\n    \n    const data = await res.json();\n    response.innerHTML = `<strong>作成されたID:</strong> ${data.id}<br><strong>タイトル:</strong> ${data.title}`;\n  } catch (error) {\n    response.textContent = "エラー: " + error.message;\n  }\n});',
    requiredElements: ['addeventlistener', 'submit', 'preventdefault', 'async', 'await', 'fetch', 'method', 'post', 'headers', 'content-type', 'body', 'json.stringify']
  },
  {
    level: 4,
    title: 'Promise.all',
    description: '複数の非同期処理を並列実行',
    task: '3つのAPIを同時に呼び出し、全ての結果を表示してください。',
    hint: 'Promise.all([...])で複数のPromiseを並列実行',
    type: 'dom',
    previewHtml: '<button id="loadAll">全て読み込む</button><div id="results"></div>',
    previewCss: 'button { padding: 15px 30px; background: #e67e22; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-bottom: 20px; } #results { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; } .result-card { padding: 15px; background: #ecf0f1; border-radius: 8px; }',
    starter: 'const loadAllBtn = document.querySelector("#loadAll");\nconst results = document.querySelector("#results");',
    answer: 'const loadAllBtn = document.querySelector("#loadAll");\nconst results = document.querySelector("#results");\n\nloadAllBtn.addEventListener("click", async () => {\n  results.innerHTML = "読み込み中...";\n  \n  try {\n    const [users, posts, comments] = await Promise.all([\n      fetch("https://jsonplaceholder.typicode.com/users").then(r => r.json()),\n      fetch("https://jsonplaceholder.typicode.com/posts").then(r => r.json()),\n      fetch("https://jsonplaceholder.typicode.com/comments").then(r => r.json())\n    ]);\n    \n    results.innerHTML = `\n      <div class="result-card"><strong>ユーザー数:</strong> ${users.length}</div>\n      <div class="result-card"><strong>投稿数:</strong> ${posts.length}</div>\n      <div class="result-card"><strong>コメント数:</strong> ${comments.length}</div>\n    `;\n  } catch (error) {\n    results.textContent = "エラー: " + error.message;\n  }\n});',
    requiredElements: ['addeventlistener', 'async', 'await', 'promise.all', 'fetch', '.then', 'innerhtml', 'try', 'catch']
  },
  {
    level: 4,
    title: 'デバウンス実装',
    description: '連続した入力の最適化',
    task: '入力のデバウンス処理を実装してください（最後の入力から300ms後に実行）。',
    hint: 'clearTimeoutで前のタイマーをキャンセル、setTimeoutで新しいタイマーをセット',
    type: 'dom',
    previewHtml: '<input type="text" id="searchInput" placeholder="検索..."><p>検索実行: <span id="searchCount">0</span>回</p><p>最後の検索: <span id="lastSearch">なし</span></p>',
    previewCss: 'input { padding: 15px; width: 300px; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; } p { margin-top: 15px; color: #666; }',
    starter: 'const input = document.querySelector("#searchInput");\nconst searchCount = document.querySelector("#searchCount");\nconst lastSearch = document.querySelector("#lastSearch");\nlet count = 0;\nlet timerId = null;',
    answer: 'const input = document.querySelector("#searchInput");\nconst searchCount = document.querySelector("#searchCount");\nconst lastSearch = document.querySelector("#lastSearch");\nlet count = 0;\nlet timerId = null;\n\nfunction doSearch(value) {\n  count++;\n  searchCount.textContent = count;\n  lastSearch.textContent = value || "（空）";\n}\n\ninput.addEventListener("input", () => {\n  clearTimeout(timerId);\n  timerId = setTimeout(() => {\n    doSearch(input.value);\n  }, 300);\n});',
    requiredElements: ['addeventlistener', 'input', 'cleartimeout', 'settimeout', '300', 'textcontent']
  },
  {
    level: 4,
    title: 'Historyの操作',
    description: 'History APIでSPA風のナビゲーション',
    task: 'ボタンクリックでURLを変更し、戻る/進む操作に対応してください。',
    hint: 'history.pushState()でURL変更、popstateイベントで戻る/進むを検知',
    type: 'dom',
    previewHtml: '<nav><button data-page="home">ホーム</button><button data-page="about">About</button><button data-page="contact">Contact</button></nav><div id="content">ホームページです</div><p>現在のパス: <span id="currentPath">/home</span></p>',
    previewCss: 'nav { margin-bottom: 20px; } nav button { padding: 10px 20px; margin-right: 10px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; } nav button.active { background: #2c3e50; } #content { padding: 30px; background: #f5f5f5; border-radius: 8px; margin-bottom: 15px; }',
    starter: 'const buttons = document.querySelectorAll("nav button");\nconst content = document.querySelector("#content");\nconst currentPath = document.querySelector("#currentPath");\n\nconst pages = {\n  home: "ホームページです",\n  about: "Aboutページです",\n  contact: "Contactページです"\n};',
    answer: 'const buttons = document.querySelectorAll("nav button");\nconst content = document.querySelector("#content");\nconst currentPath = document.querySelector("#currentPath");\n\nconst pages = {\n  home: "ホームページです",\n  about: "Aboutページです",\n  contact: "Contactページです"\n};\n\nfunction showPage(page) {\n  content.textContent = pages[page] || "ページが見つかりません";\n  currentPath.textContent = "/" + page;\n  buttons.forEach(btn => {\n    btn.classList.toggle("active", btn.dataset.page === page);\n  });\n}\n\nbuttons.forEach(btn => {\n  btn.addEventListener("click", () => {\n    const page = btn.dataset.page;\n    history.pushState({ page }, "", "/" + page);\n    showPage(page);\n  });\n});\n\nwindow.addEventListener("popstate", (e) => {\n  const page = e.state?.page || "home";\n  showPage(page);\n});',
    requiredElements: ['history.pushstate', 'addeventlistener', 'popstate', 'dataset.page', 'classlist.toggle', 'e.state']
  },
  // Level 5: 上級
  {
    level: 5,
    title: 'Geolocation API',
    description: '現在地の取得',
    task: 'ボタンクリックで現在地の緯度・経度を取得して表示してください。',
    hint: 'navigator.geolocation.getCurrentPosition()で位置情報を取得',
    type: 'dom',
    previewHtml: '<button id="getLocation">現在地を取得</button><div id="location"><p>緯度: <span id="lat">-</span></p><p>経度: <span id="lng">-</span></p></div>',
    previewCss: 'button { padding: 15px 30px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-bottom: 20px; } #location { padding: 20px; background: #f5f5f5; border-radius: 8px; } #location p { margin: 5px 0; }',
    starter: 'const getLocationBtn = document.querySelector("#getLocation");\nconst latEl = document.querySelector("#lat");\nconst lngEl = document.querySelector("#lng");',
    answer: 'const getLocationBtn = document.querySelector("#getLocation");\nconst latEl = document.querySelector("#lat");\nconst lngEl = document.querySelector("#lng");\n\ngetLocationBtn.addEventListener("click", () => {\n  if (!navigator.geolocation) {\n    latEl.textContent = "非対応";\n    return;\n  }\n  \n  latEl.textContent = "取得中...";\n  lngEl.textContent = "取得中...";\n  \n  navigator.geolocation.getCurrentPosition(\n    (position) => {\n      latEl.textContent = position.coords.latitude.toFixed(6);\n      lngEl.textContent = position.coords.longitude.toFixed(6);\n    },\n    (error) => {\n      latEl.textContent = "エラー: " + error.message;\n      lngEl.textContent = "-";\n    }\n  );\n});',
    requiredElements: ['navigator.geolocation', 'getcurrentposition', 'position.coords.latitude', 'position.coords.longitude', 'tofixed', 'addeventlistener']
  },
  {
    level: 5,
    title: 'Clipboard API',
    description: 'クリップボード操作',
    task: 'テキストのコピーとペースト機能を実装してください。',
    hint: 'navigator.clipboard.writeText()でコピー、readText()でペースト',
    type: 'dom',
    previewHtml: '<textarea id="source" placeholder="コピーするテキスト">サンプルテキスト</textarea><button id="copyBtn">コピー</button><button id="pasteBtn">ペースト</button><textarea id="target" placeholder="ペースト先"></textarea><p id="status"></p>',
    previewCss: 'textarea { display: block; width: 300px; height: 80px; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; } button { padding: 10px 20px; margin-right: 10px; color: white; border: none; border-radius: 5px; cursor: pointer; } #copyBtn { background: #3498db; } #pasteBtn { background: #27ae60; } #status { margin-top: 10px; color: #666; }',
    starter: 'const source = document.querySelector("#source");\nconst target = document.querySelector("#target");\nconst copyBtn = document.querySelector("#copyBtn");\nconst pasteBtn = document.querySelector("#pasteBtn");\nconst status = document.querySelector("#status");',
    answer: 'const source = document.querySelector("#source");\nconst target = document.querySelector("#target");\nconst copyBtn = document.querySelector("#copyBtn");\nconst pasteBtn = document.querySelector("#pasteBtn");\nconst status = document.querySelector("#status");\n\ncopyBtn.addEventListener("click", async () => {\n  try {\n    await navigator.clipboard.writeText(source.value);\n    status.textContent = "コピーしました！";\n  } catch (err) {\n    status.textContent = "コピー失敗: " + err.message;\n  }\n});\n\npasteBtn.addEventListener("click", async () => {\n  try {\n    const text = await navigator.clipboard.readText();\n    target.value = text;\n    status.textContent = "ペーストしました！";\n  } catch (err) {\n    status.textContent = "ペースト失敗: " + err.message;\n  }\n});',
    requiredElements: ['async', 'await', 'navigator.clipboard.writetext', 'navigator.clipboard.readtext', 'try', 'catch', 'addeventlistener']
  },
  {
    level: 5,
    title: 'Web Storage イベント',
    description: 'ストレージ変更の検知',
    task: '別タブでのLocalStorage変更を検知して表示を更新してください。',
    hint: 'windowのstorageイベントで他タブの変更を検知',
    type: 'dom',
    previewHtml: '<div class="storage-sync"><input type="text" id="syncInput" placeholder="入力すると同期"><p>現在の値: <span id="currentValue">-</span></p><p>最終更新: <span id="lastUpdate">-</span></p></div>',
    previewCss: '.storage-sync { padding: 20px; } input { padding: 10px; width: 250px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px; } p { margin: 5px 0; color: #666; }',
    starter: 'const syncInput = document.querySelector("#syncInput");\nconst currentValue = document.querySelector("#currentValue");\nconst lastUpdate = document.querySelector("#lastUpdate");',
    answer: 'const syncInput = document.querySelector("#syncInput");\nconst currentValue = document.querySelector("#currentValue");\nconst lastUpdate = document.querySelector("#lastUpdate");\n\n// 初期値を読み込み\nconst stored = localStorage.getItem("syncData");\nif (stored) {\n  currentValue.textContent = stored;\n}\n\n// 入力時に保存\nsyncInput.addEventListener("input", () => {\n  const value = syncInput.value;\n  localStorage.setItem("syncData", value);\n  currentValue.textContent = value;\n  lastUpdate.textContent = new Date().toLocaleTimeString();\n});\n\n// 他タブの変更を検知\nwindow.addEventListener("storage", (e) => {\n  if (e.key === "syncData") {\n    currentValue.textContent = e.newValue || "-";\n    lastUpdate.textContent = new Date().toLocaleTimeString() + " (他タブ)";\n  }\n});',
    requiredElements: ['localstorage.getitem', 'localstorage.setitem', 'addeventlistener', 'input', 'storage', 'e.key', 'e.newvalue', 'tolocaetimestring']
  },
  {
    level: 5,
    title: 'AbortController',
    description: 'Fetchリクエストのキャンセル',
    task: 'fetchリクエストをキャンセルできる機能を実装してください。',
    hint: 'AbortControllerでシグナルを作成、controller.abort()でキャンセル',
    type: 'dom',
    previewHtml: '<button id="startBtn">リクエスト開始</button><button id="cancelBtn">キャンセル</button><p id="status">待機中</p>',
    previewCss: 'button { padding: 12px 25px; margin-right: 10px; color: white; border: none; border-radius: 5px; cursor: pointer; } #startBtn { background: #3498db; } #cancelBtn { background: #e74c3c; } #status { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }',
    starter: 'const startBtn = document.querySelector("#startBtn");\nconst cancelBtn = document.querySelector("#cancelBtn");\nconst status = document.querySelector("#status");\nlet controller = null;',
    answer: 'const startBtn = document.querySelector("#startBtn");\nconst cancelBtn = document.querySelector("#cancelBtn");\nconst status = document.querySelector("#status");\nlet controller = null;\n\nstartBtn.addEventListener("click", async () => {\n  controller = new AbortController();\n  status.textContent = "読み込み中...";\n  \n  try {\n    const response = await fetch("https://jsonplaceholder.typicode.com/posts", {\n      signal: controller.signal\n    });\n    const data = await response.json();\n    status.textContent = `取得完了: ${data.length}件のデータ`;\n  } catch (error) {\n    if (error.name === "AbortError") {\n      status.textContent = "キャンセルされました";\n    } else {\n      status.textContent = "エラー: " + error.message;\n    }\n  }\n});\n\ncancelBtn.addEventListener("click", () => {\n  if (controller) {\n    controller.abort();\n  }\n});',
    requiredElements: ['new abortcontroller', 'controller.signal', 'controller.abort', 'async', 'await', 'fetch', 'try', 'catch', 'aborterror']
  },
  // Level 6: 実践
  {
    level: 6,
    title: '検索APIの実装',
    description: '検索機能付きデータ取得',
    task: 'デバウンス付きのリアルタイム検索を実装してください。',
    hint: 'fetchとデバウンスを組み合わせ、クエリパラメータで検索',
    type: 'dom',
    previewHtml: '<input type="text" id="searchInput" placeholder="ユーザーを検索..."><div id="results"></div>',
    previewCss: 'input { padding: 15px; width: 100%; box-sizing: border-box; font-size: 16px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 20px; } #results { min-height: 200px; } .user-card { padding: 15px; background: #f5f5f5; border-radius: 8px; margin-bottom: 10px; } .user-card h3 { margin: 0 0 5px; } .user-card p { margin: 0; color: #666; font-size: 14px; }',
    starter: 'const searchInput = document.querySelector("#searchInput");\nconst results = document.querySelector("#results");\nlet timerId = null;',
    answer: 'const searchInput = document.querySelector("#searchInput");\nconst results = document.querySelector("#results");\nlet timerId = null;\n\nasync function searchUsers(query) {\n  results.innerHTML = "<p>検索中...</p>";\n  \n  try {\n    const response = await fetch("https://jsonplaceholder.typicode.com/users");\n    const users = await response.json();\n    \n    const filtered = users.filter(user => \n      user.name.toLowerCase().includes(query.toLowerCase()) ||\n      user.email.toLowerCase().includes(query.toLowerCase())\n    );\n    \n    if (filtered.length === 0) {\n      results.innerHTML = "<p>結果が見つかりません</p>";\n      return;\n    }\n    \n    results.innerHTML = filtered.map(user => `\n      <div class="user-card">\n        <h3>${user.name}</h3>\n        <p>${user.email}</p>\n      </div>\n    `).join("");\n  } catch (error) {\n    results.innerHTML = `<p>エラー: ${error.message}</p>`;\n  }\n}\n\nsearchInput.addEventListener("input", () => {\n  clearTimeout(timerId);\n  const query = searchInput.value.trim();\n  \n  if (!query) {\n    results.innerHTML = "";\n    return;\n  }\n  \n  timerId = setTimeout(() => {\n    searchUsers(query);\n  }, 300);\n});',
    requiredElements: ['async', 'await', 'fetch', 'filter', 'tolowercase', 'includes', 'cleartimeout', 'settimeout', 'map', 'join', 'innerhtml']
  },
  {
    level: 6,
    title: 'オフライン対応',
    description: 'オンライン/オフライン状態の検知',
    task: 'オフライン時にキャッシュからデータを表示する機能を実装してください。',
    hint: 'navigator.onLineで接続状態を確認、offline/onlineイベントで変化を検知',
    type: 'dom',
    previewHtml: '<div class="status-bar" id="statusBar">オンライン</div><button id="loadBtn">データを読み込む</button><div id="data"></div>',
    previewCss: '.status-bar { padding: 10px; text-align: center; color: white; margin-bottom: 20px; border-radius: 5px; } .status-bar.online { background: #27ae60; } .status-bar.offline { background: #e74c3c; } button { padding: 15px 30px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 20px; } #data { padding: 20px; background: #f5f5f5; border-radius: 8px; min-height: 100px; }',
    starter: 'const statusBar = document.querySelector("#statusBar");\nconst loadBtn = document.querySelector("#loadBtn");\nconst dataDiv = document.querySelector("#data");',
    answer: 'const statusBar = document.querySelector("#statusBar");\nconst loadBtn = document.querySelector("#loadBtn");\nconst dataDiv = document.querySelector("#data");\n\nfunction updateStatus() {\n  if (navigator.onLine) {\n    statusBar.textContent = "オンライン";\n    statusBar.className = "status-bar online";\n  } else {\n    statusBar.textContent = "オフライン";\n    statusBar.className = "status-bar offline";\n  }\n}\n\nupdateStatus();\n\nwindow.addEventListener("online", updateStatus);\nwindow.addEventListener("offline", updateStatus);\n\nloadBtn.addEventListener("click", async () => {\n  if (navigator.onLine) {\n    try {\n      const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");\n      const post = await response.json();\n      localStorage.setItem("cachedPost", JSON.stringify(post));\n      dataDiv.innerHTML = `<h3>${post.title}</h3><p>${post.body}</p>`;\n    } catch (error) {\n      dataDiv.textContent = "エラー: " + error.message;\n    }\n  } else {\n    const cached = localStorage.getItem("cachedPost");\n    if (cached) {\n      const post = JSON.parse(cached);\n      dataDiv.innerHTML = `<h3>${post.title}</h3><p>${post.body}</p><p><em>(キャッシュから表示)</em></p>`;\n    } else {\n      dataDiv.textContent = "オフラインです。キャッシュがありません。";\n    }\n  }\n});',
    requiredElements: ['navigator.online', 'addeventlistener', 'online', 'offline', 'async', 'await', 'fetch', 'localstorage.setitem', 'localstorage.getitem', 'json.stringify', 'json.parse']
  },
  {
    level: 6,
    title: 'ファイルダウンロード',
    description: 'Blob URLでファイル生成・ダウンロード',
    task: '入力されたテキストをファイルとしてダウンロードする機能を実装してください。',
    hint: 'new Blob()でファイル作成、URL.createObjectURL()でダウンロードリンク生成',
    type: 'dom',
    previewHtml: '<textarea id="content" placeholder="ダウンロードする内容を入力">サンプルテキストです。\nこの内容がファイルとして保存されます。</textarea><input type="text" id="filename" placeholder="ファイル名" value="sample.txt"><button id="downloadBtn">ダウンロード</button>',
    previewCss: 'textarea { display: block; width: 300px; height: 150px; padding: 15px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px; } input { display: block; width: 300px; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; } button { padding: 15px 30px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }',
    starter: 'const content = document.querySelector("#content");\nconst filename = document.querySelector("#filename");\nconst downloadBtn = document.querySelector("#downloadBtn");',
    answer: 'const content = document.querySelector("#content");\nconst filename = document.querySelector("#filename");\nconst downloadBtn = document.querySelector("#downloadBtn");\n\ndownloadBtn.addEventListener("click", () => {\n  const text = content.value;\n  const blob = new Blob([text], { type: "text/plain" });\n  const url = URL.createObjectURL(blob);\n  \n  const a = document.createElement("a");\n  a.href = url;\n  a.download = filename.value || "download.txt";\n  document.body.appendChild(a);\n  a.click();\n  document.body.removeChild(a);\n  \n  URL.revokeObjectURL(url);\n});',
    requiredElements: ['addeventlistener', 'new blob', 'type', 'text/plain', 'url.createobjecturl', 'createelement', 'href', 'download', 'appendchild', 'click', 'removechild', 'url.revokeobjecturl']
  },
  {
    level: 6,
    title: 'ページネーション',
    description: 'APIデータのページネーション',
    task: 'APIからデータを取得し、ページネーションで表示してください。',
    hint: '_page、_limitパラメータでページ指定',
    type: 'dom',
    previewHtml: '<div id="posts"></div><div class="pagination"><button id="prevBtn">前へ</button><span id="pageInfo">1 / ?</span><button id="nextBtn">次へ</button></div>',
    previewCss: '#posts { min-height: 300px; margin-bottom: 20px; } .post { padding: 15px; background: #f5f5f5; border-radius: 8px; margin-bottom: 10px; } .post h3 { margin: 0 0 5px; font-size: 16px; } .post p { margin: 0; color: #666; font-size: 14px; } .pagination { display: flex; justify-content: center; align-items: center; gap: 20px; } .pagination button { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; } .pagination button:disabled { background: #bdc3c7; cursor: not-allowed; }',
    starter: 'const postsDiv = document.querySelector("#posts");\nconst prevBtn = document.querySelector("#prevBtn");\nconst nextBtn = document.querySelector("#nextBtn");\nconst pageInfo = document.querySelector("#pageInfo");\n\nlet currentPage = 1;\nconst perPage = 5;\nconst totalPages = 20;',
    answer: 'const postsDiv = document.querySelector("#posts");\nconst prevBtn = document.querySelector("#prevBtn");\nconst nextBtn = document.querySelector("#nextBtn");\nconst pageInfo = document.querySelector("#pageInfo");\n\nlet currentPage = 1;\nconst perPage = 5;\nconst totalPages = 20;\n\nasync function loadPosts(page) {\n  postsDiv.innerHTML = "<p>読み込み中...</p>";\n  \n  try {\n    const response = await fetch(\n      `https://jsonplaceholder.typicode.com/posts?_page=${page}&_limit=${perPage}`\n    );\n    const posts = await response.json();\n    \n    postsDiv.innerHTML = posts.map(post => `\n      <div class="post">\n        <h3>${post.title}</h3>\n        <p>${post.body.substring(0, 100)}...</p>\n      </div>\n    `).join("");\n    \n    updateButtons();\n  } catch (error) {\n    postsDiv.innerHTML = `<p>エラー: ${error.message}</p>`;\n  }\n}\n\nfunction updateButtons() {\n  pageInfo.textContent = `${currentPage} / ${totalPages}`;\n  prevBtn.disabled = currentPage === 1;\n  nextBtn.disabled = currentPage === totalPages;\n}\n\nprevBtn.addEventListener("click", () => {\n  if (currentPage > 1) {\n    currentPage--;\n    loadPosts(currentPage);\n  }\n});\n\nnextBtn.addEventListener("click", () => {\n  if (currentPage < totalPages) {\n    currentPage++;\n    loadPosts(currentPage);\n  }\n});\n\nloadPosts(1);',
    requiredElements: ['async', 'await', 'fetch', '_page', '_limit', 'map', 'join', 'innerhtml', 'disabled', 'addeventlistener', 'currentpage']
  },
  {
    level: 6,
    title: 'フォームデータの永続化',
    description: '自動保存・復元機能',
    task: 'フォーム入力を自動保存し、リロード後も復元する機能を実装してください。',
    hint: 'inputイベントで自動保存、DOMContentLoadedで復元',
    type: 'dom',
    previewHtml: '<form id="autoSaveForm"><input type="text" name="title" placeholder="タイトル"><textarea name="content" placeholder="本文"></textarea><button type="button" id="clearBtn">クリア</button></form><p id="saveStatus"></p>',
    previewCss: 'input, textarea { display: block; width: 300px; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; } textarea { height: 120px; } #clearBtn { padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; } #saveStatus { margin-top: 10px; color: #27ae60; font-size: 14px; }',
    starter: 'const form = document.querySelector("#autoSaveForm");\nconst clearBtn = document.querySelector("#clearBtn");\nconst saveStatus = document.querySelector("#saveStatus");\nconst STORAGE_KEY = "autoSaveForm";',
    answer: 'const form = document.querySelector("#autoSaveForm");\nconst clearBtn = document.querySelector("#clearBtn");\nconst saveStatus = document.querySelector("#saveStatus");\nconst STORAGE_KEY = "autoSaveForm";\n\n// 保存された値を復元\nconst saved = localStorage.getItem(STORAGE_KEY);\nif (saved) {\n  const data = JSON.parse(saved);\n  Object.keys(data).forEach(key => {\n    const input = form.elements[key];\n    if (input) input.value = data[key];\n  });\n  saveStatus.textContent = "前回の入力を復元しました";\n}\n\n// 入力時に自動保存\nlet saveTimer = null;\nform.addEventListener("input", () => {\n  clearTimeout(saveTimer);\n  saveTimer = setTimeout(() => {\n    const data = {};\n    Array.from(form.elements).forEach(el => {\n      if (el.name) data[el.name] = el.value;\n    });\n    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));\n    saveStatus.textContent = "自動保存しました (" + new Date().toLocaleTimeString() + ")";\n  }, 500);\n});\n\n// クリア\nclearBtn.addEventListener("click", () => {\n  localStorage.removeItem(STORAGE_KEY);\n  form.reset();\n  saveStatus.textContent = "クリアしました";\n});',
    requiredElements: ['localstorage.getitem', 'json.parse', 'object.keys', 'foreach', 'form.elements', 'addeventlistener', 'input', 'cleartimeout', 'settimeout', 'array.from', 'localstorage.setitem', 'json.stringify', 'localstorage.removeitem', 'form.reset']
  },
  {
    level: 6,
    title: 'WebSocket風チャット',
    description: 'ローカルストレージでチャットを模擬',
    task: 'LocalStorageのstorageイベントを使って、複数タブ間でメッセージを送受信してください。',
    hint: 'タイムスタンプ付きでメッセージを保存し、storageイベントで検知',
    type: 'dom',
    previewHtml: '<div class="chat-container"><div id="messages"></div><form id="chatForm"><input type="text" id="messageInput" placeholder="メッセージを入力"><button type="submit">送信</button></form></div>',
    previewCss: '.chat-container { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; } #messages { height: 250px; overflow-y: auto; padding: 15px; background: #f5f5f5; } .message { padding: 10px 15px; margin-bottom: 10px; border-radius: 8px; max-width: 80%; } .message.sent { background: #3498db; color: white; margin-left: auto; } .message.received { background: white; } .message .time { font-size: 11px; opacity: 0.7; margin-top: 5px; } #chatForm { display: flex; padding: 15px; background: white; } #chatForm input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-right: 10px; } #chatForm button { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; }',
    starter: 'const messagesDiv = document.querySelector("#messages");\nconst chatForm = document.querySelector("#chatForm");\nconst messageInput = document.querySelector("#messageInput");\nconst tabId = Date.now().toString();',
    answer: 'const messagesDiv = document.querySelector("#messages");\nconst chatForm = document.querySelector("#chatForm");\nconst messageInput = document.querySelector("#messageInput");\nconst tabId = Date.now().toString();\n\nfunction addMessage(text, isSent) {\n  const div = document.createElement("div");\n  div.className = `message ${isSent ? "sent" : "received"}`;\n  const time = new Date().toLocaleTimeString();\n  div.innerHTML = `<div>${text}</div><div class="time">${time}</div>`;\n  messagesDiv.appendChild(div);\n  messagesDiv.scrollTop = messagesDiv.scrollHeight;\n}\n\nchatForm.addEventListener("submit", (e) => {\n  e.preventDefault();\n  const text = messageInput.value.trim();\n  if (!text) return;\n  \n  addMessage(text, true);\n  \n  localStorage.setItem("chatMessage", JSON.stringify({\n    text,\n    tabId,\n    timestamp: Date.now()\n  }));\n  \n  messageInput.value = "";\n});\n\nwindow.addEventListener("storage", (e) => {\n  if (e.key === "chatMessage" && e.newValue) {\n    const data = JSON.parse(e.newValue);\n    if (data.tabId !== tabId) {\n      addMessage(data.text, false);\n    }\n  }\n});',
    requiredElements: ['createelement', 'classname', 'innerhtml', 'appendchild', 'scrolltop', 'scrollheight', 'addeventlistener', 'submit', 'preventdefault', 'json.stringify', 'localstorage.setitem', 'storage', 'e.key', 'e.newvalue', 'json.parse']
  }
];

// アクセシビリティ問題（20問）
const a11yExercises = [
  {
    level: 1,
    title: 'alt属性の基本',
    description: '画像に適切な代替テキストを設定',
    task: '風景写真の画像に「山と湖の風景」という代替テキストを設定してください。',
    hint: 'img要素のalt属性に説明テキストを設定します',
    type: 'html',
    previewHtml: '',
    previewCss: 'img { max-width: 100%; height: auto; border-radius: 8px; }',
    answer: '<img src="https://picsum.photos/400/300" alt="山と湖の風景">',
    requiredElements: ['<img', 'alt=', '山と湖の風景']
  },
  {
    level: 1,
    title: 'フォームラベル',
    description: 'label要素でフォームをアクセシブルに',
    task: '名前入力欄にlabel要素を関連付けてください。for属性とid属性を使います。',
    hint: 'labelのfor属性とinputのid属性を同じ値にします',
    type: 'html',
    previewHtml: '',
    previewCss: 'label { display: block; margin-bottom: 5px; font-weight: bold; } input { padding: 10px; width: 200px; border: 1px solid #ddd; border-radius: 5px; }',
    answer: '<label for="name">お名前</label>\n<input type="text" id="name">',
    requiredElements: ['<label', 'for=', 'id=', '<input']
  },
  {
    level: 1,
    title: 'ボタンのアクセシブルな名前',
    description: 'アイコンボタンに説明を追加',
    task: '検索アイコンボタンにaria-labelで「検索」という名前を付けてください。',
    hint: 'aria-label属性でスクリーンリーダー用の名前を設定',
    type: 'html',
    previewHtml: '',
    previewCss: 'button { padding: 15px 20px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 18px; }',
    answer: '<button aria-label="検索">🔍</button>',
    requiredElements: ['<button', 'aria-label', '検索']
  },
  {
    level: 1,
    title: 'セマンティックな見出し',
    description: '適切な見出し構造を作成',
    task: 'h1でページタイトル「アクセシビリティガイド」、h2でセクション「基本原則」を作成してください。',
    hint: '見出しは階層構造を意識して使います。h1→h2の順序で',
    type: 'html',
    previewHtml: '',
    previewCss: 'h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; } h2 { color: #34495e; margin-top: 20px; }',
    answer: '<h1>アクセシビリティガイド</h1>\n<h2>基本原則</h2>',
    requiredElements: ['<h1>', 'アクセシビリティガイド', '</h1>', '<h2>', '基本原則', '</h2>']
  },
  {
    level: 2,
    title: 'リンクの説明文',
    description: '曖昧なリンクテキストを改善',
    task: '「詳細はこちら」ではなく、「料金プランの詳細を見る」という具体的なリンクテキストを作成してください。',
    hint: 'リンクテキストだけで目的がわかるようにします',
    type: 'html',
    previewHtml: '',
    previewCss: 'a { color: #3498db; text-decoration: none; font-weight: bold; } a:hover { text-decoration: underline; }',
    answer: '<a href="#pricing">料金プランの詳細を見る</a>',
    requiredElements: ['<a', 'href', '料金プラン', '詳細']
  },
  {
    level: 2,
    title: 'フォーカスの可視化',
    description: 'キーボードフォーカスを見やすく',
    task: 'ボタンにフォーカスが当たったときに青い枠線(3px solid #3498db)とアウトラインオフセット(2px)を設定してください。',
    hint: ':focus-visible疑似クラスとoutlineプロパティを使用',
    type: 'css',
    previewHtml: '<button class="focus-btn">フォーカスしてみて</button><button class="focus-btn">タブキーで移動</button>',
    previewCss: '.focus-btn { padding: 15px 30px; margin: 10px; background: #2c3e50; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }',
    answer: '.focus-btn:focus-visible {\n  outline: 3px solid #3498db;\n  outline-offset: 2px;\n}',
    requiredElements: [':focus-visible', 'outline', '3px', 'solid', '#3498db', 'outline-offset', '2px']
  },
  {
    level: 2,
    title: 'スキップリンク',
    description: 'メインコンテンツへのスキップリンク',
    task: 'メインコンテンツへジャンプするスキップリンクを作成してください。href="#main"でリンクし、「メインコンテンツへスキップ」というテキストを設定。',
    hint: 'スキップリンクはキーボードユーザーがナビゲーションをスキップするために使います',
    type: 'html',
    previewHtml: '',
    previewCss: '.skip-link { position: absolute; top: -40px; left: 0; background: #2c3e50; color: white; padding: 10px 20px; z-index: 100; transition: top 0.3s; } .skip-link:focus { top: 0; }',
    answer: '<a href="#main" class="skip-link">メインコンテンツへスキップ</a>',
    requiredElements: ['<a', 'href="#main"', 'class="skip-link"', 'メインコンテンツへスキップ']
  },
  {
    level: 2,
    title: 'aria-hidden',
    description: '装飾要素をスクリーンリーダーから隠す',
    task: '装飾用のアイコンspanにaria-hidden="true"を設定してください。テキスト「送信」は読み上げられるようにします。',
    hint: '装飾的な要素はaria-hiddenで非表示に',
    type: 'html',
    previewHtml: '',
    previewCss: 'button { padding: 15px 25px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; } .icon { margin-right: 8px; }',
    answer: '<button><span class="icon" aria-hidden="true">📨</span>送信</button>',
    requiredElements: ['<button', '<span', 'aria-hidden="true"', '送信', '</button>']
  },
  {
    level: 3,
    title: 'ナビゲーションのランドマーク',
    description: 'nav要素にラベルを付ける',
    task: 'nav要素にaria-label="メインナビゲーション"を設定してナビゲーションを作成してください。',
    hint: 'aria-labelでナビゲーションの目的を明示',
    type: 'html',
    previewHtml: '',
    previewCss: 'nav { background: #2c3e50; padding: 15px; border-radius: 8px; } ul { list-style: none; display: flex; gap: 20px; margin: 0; padding: 0; } a { color: white; text-decoration: none; }',
    answer: '<nav aria-label="メインナビゲーション">\n  <ul>\n    <li><a href="#home">ホーム</a></li>\n    <li><a href="#about">概要</a></li>\n    <li><a href="#contact">お問い合わせ</a></li>\n  </ul>\n</nav>',
    requiredElements: ['<nav', 'aria-label', 'メインナビゲーション', '<ul>', '<li>', '<a']
  },
  {
    level: 3,
    title: 'ライブリージョン',
    description: '動的な更新を通知',
    task: 'ステータスメッセージ用のdivにrole="status"とaria-live="polite"を設定してください。',
    hint: 'aria-liveでスクリーンリーダーに動的変更を通知',
    type: 'html',
    previewHtml: '',
    previewCss: '.status-message { padding: 15px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 8px; }',
    answer: '<div class="status-message" role="status" aria-live="polite">保存しました</div>',
    requiredElements: ['<div', 'role="status"', 'aria-live="polite"', '保存しました']
  },
  {
    level: 3,
    title: '必須フィールドの表示',
    description: 'aria-requiredで必須を示す',
    task: 'メールアドレス入力欄を必須フィールドとしてマークしてください。aria-required="true"を使用します。',
    hint: 'aria-requiredとrequired属性の両方を設定',
    type: 'html',
    previewHtml: '',
    previewCss: 'label { display: block; margin-bottom: 5px; font-weight: bold; } .required::after { content: " *"; color: #e74c3c; } input { padding: 10px; width: 250px; border: 1px solid #ddd; border-radius: 5px; }',
    answer: '<label for="email" class="required">メールアドレス</label>\n<input type="email" id="email" aria-required="true" required>',
    requiredElements: ['<label', 'for="email"', '<input', 'type="email"', 'id="email"', 'aria-required="true"', 'required']
  },
  {
    level: 3,
    title: 'エラーメッセージの関連付け',
    description: 'aria-describedbyでエラーを説明',
    task: '入力欄にaria-describedbyでエラーメッセージを関連付けてください。エラーdivのidは"email-error"です。',
    hint: 'aria-describedbyで補足説明を関連付け',
    type: 'html',
    previewHtml: '',
    previewCss: 'label { display: block; margin-bottom: 5px; font-weight: bold; } input { padding: 10px; width: 250px; border: 2px solid #e74c3c; border-radius: 5px; } .error { color: #e74c3c; font-size: 14px; margin-top: 5px; }',
    answer: '<label for="email">メールアドレス</label>\n<input type="email" id="email" aria-describedby="email-error" aria-invalid="true">\n<div id="email-error" class="error">有効なメールアドレスを入力してください</div>',
    requiredElements: ['aria-describedby="email-error"', 'aria-invalid="true"', 'id="email-error"']
  },
  {
    level: 4,
    title: 'タブパネルのアクセシビリティ',
    description: 'role属性でタブUIを作成',
    task: 'タブリストとタブパネルに適切なrole属性を設定してください。tablist、tab、tabpanelを使用。',
    hint: 'タブにはrole="tab"、パネルにはrole="tabpanel"、リストにはrole="tablist"',
    type: 'html',
    previewHtml: '',
    previewCss: '.tabs [role="tablist"] { display: flex; border-bottom: 2px solid #ddd; } .tabs [role="tab"] { padding: 10px 20px; border: none; background: none; cursor: pointer; } .tabs [role="tab"][aria-selected="true"] { border-bottom: 2px solid #3498db; color: #3498db; } .tabs [role="tabpanel"] { padding: 20px; }',
    answer: '<div class="tabs">\n  <div role="tablist">\n    <button role="tab" aria-selected="true" aria-controls="panel1">タブ1</button>\n    <button role="tab" aria-selected="false" aria-controls="panel2">タブ2</button>\n  </div>\n  <div role="tabpanel" id="panel1">タブ1の内容</div>\n  <div role="tabpanel" id="panel2" hidden>タブ2の内容</div>\n</div>',
    requiredElements: ['role="tablist"', 'role="tab"', 'role="tabpanel"', 'aria-selected', 'aria-controls']
  },
  {
    level: 4,
    title: 'モーダルのフォーカス管理',
    description: 'aria属性でモーダルを実装',
    task: 'モーダルダイアログにrole="dialog"、aria-modal="true"、aria-labelledbyを設定してください。',
    hint: 'dialogロールとaria-modalでモーダルを宣言',
    type: 'html',
    previewHtml: '',
    previewCss: '.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; } .modal { background: white; padding: 30px; border-radius: 12px; max-width: 400px; } .modal h2 { margin-top: 0; }',
    answer: '<div class="modal-overlay">\n  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">\n    <h2 id="modal-title">確認</h2>\n    <p>この操作を実行しますか？</p>\n    <button>OK</button>\n    <button>キャンセル</button>\n  </div>\n</div>',
    requiredElements: ['role="dialog"', 'aria-modal="true"', 'aria-labelledby', 'id="modal-title"']
  },
  {
    level: 4,
    title: 'プログレスバーのアクセシビリティ',
    description: 'progressbar roleで進捗を通知',
    task: 'プログレスバーにrole="progressbar"と進捗状態を示すaria属性を設定してください。現在値30、最大値100。',
    hint: 'aria-valuenow、aria-valuemin、aria-valuemaxで進捗を表現',
    type: 'html',
    previewHtml: '',
    previewCss: '.progress-container { background: #ecf0f1; border-radius: 10px; overflow: hidden; } .progress-bar { height: 30px; background: linear-gradient(90deg, #3498db, #2980b9); transition: width 0.3s; }',
    answer: '<div class="progress-container">\n  <div class="progress-bar" role="progressbar" aria-valuenow="30" aria-valuemin="0" aria-valuemax="100" aria-label="アップロード進捗" style="width: 30%"></div>\n</div>',
    requiredElements: ['role="progressbar"', 'aria-valuenow="30"', 'aria-valuemin="0"', 'aria-valuemax="100"', 'aria-label']
  },
  {
    level: 4,
    title: '色に頼らない情報伝達',
    description: 'アイコンとテキストで状態を表示',
    task: 'エラー状態を色だけでなく、アイコン（✕）とテキストでも表示してください。',
    hint: '色覚に関係なく情報が伝わるようにします',
    type: 'html',
    previewHtml: '',
    previewCss: '.status { padding: 15px 20px; border-radius: 8px; display: flex; align-items: center; gap: 10px; } .status.error { background: #ffeaea; border: 1px solid #e74c3c; color: #c0392b; } .status-icon { font-weight: bold; }',
    answer: '<div class="status error" role="alert">\n  <span class="status-icon" aria-hidden="true">✕</span>\n  <span>エラー: 入力内容に問題があります</span>\n</div>',
    requiredElements: ['role="alert"', 'aria-hidden="true"', 'エラー']
  },
  {
    level: 5,
    title: 'キーボードナビゲーション',
    description: 'JSでキーボード操作を実装',
    task: 'メニュー項目間を矢印キーで移動できるようにしてください。ArrowUpとArrowDownに対応。',
    hint: 'keydownイベントでe.keyをチェック、focusで移動',
    type: 'dom',
    previewHtml: '<ul class="menu" role="menu"><li role="menuitem" tabindex="0">項目1</li><li role="menuitem" tabindex="-1">項目2</li><li role="menuitem" tabindex="-1">項目3</li><li role="menuitem" tabindex="-1">項目4</li></ul>',
    previewCss: '.menu { list-style: none; padding: 0; width: 200px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; } .menu li { padding: 15px; cursor: pointer; } .menu li:hover, .menu li:focus { background: #3498db; color: white; outline: none; }',
    starter: 'const menu = document.querySelector(".menu");\nconst items = menu.querySelectorAll("[role=menuitem]");',
    answer: 'const menu = document.querySelector(".menu");\nconst items = menu.querySelectorAll("[role=menuitem]");\n\nlet currentIndex = 0;\n\nmenu.addEventListener("keydown", (e) => {\n  if (e.key === "ArrowDown") {\n    e.preventDefault();\n    currentIndex = (currentIndex + 1) % items.length;\n    items[currentIndex].focus();\n  } else if (e.key === "ArrowUp") {\n    e.preventDefault();\n    currentIndex = (currentIndex - 1 + items.length) % items.length;\n    items[currentIndex].focus();\n  }\n});\n\nitems.forEach((item, index) => {\n  item.addEventListener("focus", () => {\n    currentIndex = index;\n  });\n});',
    requiredElements: ['addeventlistener', 'keydown', 'arrowdown', 'arrowup', 'preventdefault', 'focus', 'currentindex']
  },
  {
    level: 5,
    title: 'フォーカストラップ',
    description: 'モーダル内にフォーカスを閉じ込める',
    task: 'モーダル内でTabキーを押したとき、フォーカスがモーダル外に出ないようにしてください。',
    hint: '最初と最後のフォーカス可能要素を検出し、ループさせます',
    type: 'dom',
    previewHtml: '<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true"><h2>モーダル</h2><input type="text" placeholder="名前"><input type="email" placeholder="メール"><button id="cancelBtn">キャンセル</button><button id="submitBtn">送信</button></div></div>',
    previewCss: '.modal-bg { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; } .modal { background: white; padding: 30px; border-radius: 12px; width: 300px; } .modal h2 { margin-top: 0; } .modal input { display: block; width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; } .modal button { padding: 10px 20px; margin-right: 10px; border: none; border-radius: 5px; cursor: pointer; } #submitBtn { background: #3498db; color: white; } #cancelBtn { background: #ecf0f1; }',
    starter: 'const modal = document.querySelector(".modal");\nconst focusableElements = modal.querySelectorAll("input, button");\nconst firstElement = focusableElements[0];\nconst lastElement = focusableElements[focusableElements.length - 1];',
    answer: 'const modal = document.querySelector(".modal");\nconst focusableElements = modal.querySelectorAll("input, button");\nconst firstElement = focusableElements[0];\nconst lastElement = focusableElements[focusableElements.length - 1];\n\nfirstElement.focus();\n\nmodal.addEventListener("keydown", (e) => {\n  if (e.key === "Tab") {\n    if (e.shiftKey) {\n      if (document.activeElement === firstElement) {\n        e.preventDefault();\n        lastElement.focus();\n      }\n    } else {\n      if (document.activeElement === lastElement) {\n        e.preventDefault();\n        firstElement.focus();\n      }\n    }\n  }\n  \n  if (e.key === "Escape") {\n    modal.closest(".modal-bg").style.display = "none";\n  }\n});',
    requiredElements: ['addeventlistener', 'keydown', 'tab', 'shiftkey', 'document.activeelement', 'preventdefault', 'focus', 'escape']
  },
  {
    level: 5,
    title: 'aria-expandedの制御',
    description: 'アコーディオンの開閉状態を通知',
    task: 'アコーディオンボタンのaria-expanded属性を開閉に応じて切り替えてください。',
    hint: 'クリック時にaria-expandedをtrue/falseで切り替え',
    type: 'dom',
    previewHtml: '<div class="accordion"><button class="accordion-btn" aria-expanded="false" aria-controls="content1">セクション1</button><div id="content1" class="accordion-content" hidden>アコーディオンの内容がここに表示されます。</div></div>',
    previewCss: '.accordion { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; } .accordion-btn { width: 100%; padding: 15px 20px; background: #f5f5f5; border: none; text-align: left; cursor: pointer; font-size: 16px; display: flex; justify-content: space-between; } .accordion-btn::after { content: "+"; font-weight: bold; } .accordion-btn[aria-expanded="true"]::after { content: "-"; } .accordion-content { padding: 20px; background: white; }',
    starter: 'const btn = document.querySelector(".accordion-btn");\nconst content = document.querySelector(".accordion-content");',
    answer: 'const btn = document.querySelector(".accordion-btn");\nconst content = document.querySelector(".accordion-content");\n\nbtn.addEventListener("click", () => {\n  const isExpanded = btn.getAttribute("aria-expanded") === "true";\n  \n  btn.setAttribute("aria-expanded", !isExpanded);\n  content.hidden = isExpanded;\n});',
    requiredElements: ['addeventlistener', 'click', 'getattribute', 'aria-expanded', 'setattribute', 'hidden']
  },
  {
    level: 6,
    title: 'ライブリージョンの実装',
    description: '検索結果の更新を通知',
    task: '検索結果が更新されたとき、スクリーンリーダーに結果数を通知してください。aria-liveリージョンを使用。',
    hint: 'aria-live="polite"の要素に結果数を出力',
    type: 'dom',
    previewHtml: '<input type="search" id="searchInput" placeholder="検索..."><div id="liveRegion" aria-live="polite" aria-atomic="true" class="sr-only"></div><div id="results"></div>',
    previewCss: 'input { padding: 12px; width: 300px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px; } #results { min-height: 100px; } .result-item { padding: 10px; background: #f5f5f5; margin: 5px 0; border-radius: 5px; } .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }',
    starter: 'const searchInput = document.querySelector("#searchInput");\nconst liveRegion = document.querySelector("#liveRegion");\nconst results = document.querySelector("#results");\n\nconst items = ["りんご", "バナナ", "オレンジ", "ぶどう", "メロン", "いちご"];',
    answer: 'const searchInput = document.querySelector("#searchInput");\nconst liveRegion = document.querySelector("#liveRegion");\nconst results = document.querySelector("#results");\n\nconst items = ["りんご", "バナナ", "オレンジ", "ぶどう", "メロン", "いちご"];\n\nsearchInput.addEventListener("input", () => {\n  const query = searchInput.value.toLowerCase();\n  const filtered = items.filter(item => item.includes(query));\n  \n  results.innerHTML = filtered.map(item => \n    `<div class="result-item">${item}</div>`\n  ).join("");\n  \n  if (query) {\n    liveRegion.textContent = `${filtered.length}件の結果が見つかりました`;\n  } else {\n    liveRegion.textContent = "";\n    results.innerHTML = "";\n  }\n});',
    requiredElements: ['addeventlistener', 'input', 'filter', 'includes', 'innerhtml', 'textcontent', 'liveregion', '件の結果']
  }
];

// CSSアニメーション問題（20問）
const animationExercises = [
  {
    level: 1,
    title: 'トランジションの基本',
    description: 'hover時の色変化をスムーズに',
    task: '.boxにtransitionを設定し、hover時の背景色変化を0.3秒でスムーズにしてください。',
    hint: 'transition: background-color 0.3s; を設定',
    type: 'css',
    previewHtml: '<div class="box">ホバーしてね</div>',
    previewCss: '.box { padding: 40px; background: #3498db; color: white; text-align: center; cursor: pointer; border-radius: 8px; } .box:hover { background: #e74c3c; }',
    answer: '.box {\n  transition: background-color 0.3s;\n}',
    requiredElements: ['transition', 'background-color', '0.3s']
  },
  {
    level: 1,
    title: 'transform: scale',
    description: 'hover時に要素を拡大',
    task: '.cardをhover時に1.1倍に拡大してください。transitionも0.3秒で設定。',
    hint: 'transform: scale(1.1); とtransitionを組み合わせます',
    type: 'css',
    previewHtml: '<div class="card">拡大カード</div>',
    previewCss: '.card { padding: 30px; background: white; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; border-radius: 12px; cursor: pointer; }',
    answer: '.card {\n  transition: transform 0.3s;\n}\n\n.card:hover {\n  transform: scale(1.1);\n}',
    requiredElements: ['transition', 'transform', '0.3s', ':hover', 'scale', '1.1']
  },
  {
    level: 1,
    title: 'transform: rotate',
    description: 'hover時に要素を回転',
    task: '.iconをhover時に180度回転させてください。transitionは0.5秒。',
    hint: 'transform: rotate(180deg); を使用',
    type: 'css',
    previewHtml: '<div class="icon">▶</div>',
    previewCss: '.icon { width: 60px; height: 60px; background: #9b59b6; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; border-radius: 50%; cursor: pointer; }',
    answer: '.icon {\n  transition: transform 0.5s;\n}\n\n.icon:hover {\n  transform: rotate(180deg);\n}',
    requiredElements: ['transition', 'transform', '0.5s', ':hover', 'rotate', '180deg']
  },
  {
    level: 1,
    title: 'opacity トランジション',
    description: 'フェードイン効果',
    task: '.fadeBoxをhover時にopacity 0.5にし、0.3秒でフェードさせてください。',
    hint: 'transitionとopacityを組み合わせます',
    type: 'css',
    previewHtml: '<div class="fade-box">フェード</div>',
    previewCss: '.fade-box { padding: 40px; background: #2c3e50; color: white; text-align: center; border-radius: 8px; cursor: pointer; }',
    answer: '.fade-box {\n  transition: opacity 0.3s;\n}\n\n.fade-box:hover {\n  opacity: 0.5;\n}',
    requiredElements: ['transition', 'opacity', '0.3s', ':hover', '0.5']
  },
  {
    level: 2,
    title: 'transform: translateY',
    description: 'hover時に上に移動',
    task: '.cardをhover時に上に10px移動させ、影を強くしてください。',
    hint: 'transform: translateY(-10px); で上方向に移動',
    type: 'css',
    previewHtml: '<div class="card">浮き上がるカード</div>',
    previewCss: '.card { padding: 30px; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; border-radius: 12px; cursor: pointer; }',
    answer: '.card {\n  transition: transform 0.3s, box-shadow 0.3s;\n}\n\n.card:hover {\n  transform: translateY(-10px);\n  box-shadow: 0 10px 30px rgba(0,0,0,0.2);\n}',
    requiredElements: ['transition', 'transform', ':hover', 'translatey', '-10px', 'box-shadow']
  },
  {
    level: 2,
    title: '複数のトランジション',
    description: '複数プロパティを同時にアニメーション',
    task: 'ボタンのbackground-color、transform、box-shadowを同時に0.3秒でトランジションさせてください。',
    hint: 'transition: all 0.3s; または個別にカンマ区切りで指定',
    type: 'css',
    previewHtml: '<button class="btn">ボタン</button>',
    previewCss: '.btn { padding: 15px 40px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; } .btn:hover { background: #2980b9; transform: scale(1.05); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }',
    answer: '.btn {\n  transition: background-color 0.3s, transform 0.3s, box-shadow 0.3s;\n}',
    requiredElements: ['transition', 'background-color', 'transform', 'box-shadow', '0.3s']
  },
  {
    level: 2,
    title: '@keyframes 基本',
    description: 'キーフレームアニメーション作成',
    task: 'fadeInという名前で、opacity 0から1へ変化するキーフレームを作成してください。',
    hint: '@keyframes fadeIn { from { } to { } } の形式',
    type: 'css',
    previewHtml: '<div class="fade-element">フェードイン</div>',
    previewCss: '.fade-element { padding: 30px; background: #27ae60; color: white; text-align: center; border-radius: 8px; animation: fadeIn 1s; }',
    answer: '@keyframes fadeIn {\n  from {\n    opacity: 0;\n  }\n  to {\n    opacity: 1;\n  }\n}',
    requiredElements: ['@keyframes', 'fadein', 'from', 'to', 'opacity', '0', '1']
  },
  {
    level: 2,
    title: 'animation プロパティ',
    description: 'アニメーションを要素に適用',
    task: '.boxにfadeInアニメーションを1秒で適用してください。',
    hint: 'animation: アニメーション名 時間; で適用',
    type: 'css',
    previewHtml: '<div class="box">アニメーション</div>',
    previewCss: '@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .box { padding: 40px; background: #e74c3c; color: white; text-align: center; border-radius: 8px; }',
    answer: '.box {\n  animation: fadeIn 1s;\n}',
    requiredElements: ['animation', 'fadein', '1s']
  },
  {
    level: 3,
    title: 'スライドインアニメーション',
    description: '左からスライドイン',
    task: 'slideInLeftキーフレームを作成。translateX(-100%)から0へ移動。',
    hint: 'transform: translateX()で横方向の移動',
    type: 'css',
    previewHtml: '<div class="slide-box">スライドイン</div>',
    previewCss: '.slide-box { padding: 30px; background: #9b59b6; color: white; text-align: center; border-radius: 8px; animation: slideInLeft 0.5s ease-out; }',
    answer: '@keyframes slideInLeft {\n  from {\n    transform: translateX(-100%);\n    opacity: 0;\n  }\n  to {\n    transform: translateX(0);\n    opacity: 1;\n  }\n}',
    requiredElements: ['@keyframes', 'slideinleft', 'translatex', '-100%', '0', 'opacity']
  },
  {
    level: 3,
    title: 'パルスアニメーション',
    description: '脈打つような効果',
    task: 'pulseキーフレームを作成。scale(1)→scale(1.1)→scale(1)と変化。',
    hint: '0%、50%、100%で段階的に変化させます',
    type: 'css',
    previewHtml: '<div class="pulse-box">パルス</div>',
    previewCss: '.pulse-box { width: 100px; height: 100px; background: #e74c3c; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; animation: pulse 1s infinite; }',
    answer: '@keyframes pulse {\n  0% {\n    transform: scale(1);\n  }\n  50% {\n    transform: scale(1.1);\n  }\n  100% {\n    transform: scale(1);\n  }\n}',
    requiredElements: ['@keyframes', 'pulse', '0%', '50%', '100%', 'transform', 'scale']
  },
  {
    level: 3,
    title: 'animation-iteration-count',
    description: '無限ループアニメーション',
    task: '.spinnerに回転アニメーションを無限に繰り返させてください。1秒で1回転。',
    hint: 'animation: spin 1s linear infinite;',
    type: 'css',
    previewHtml: '<div class="spinner"></div>',
    previewCss: '@keyframes spin { to { transform: rotate(360deg); } } .spinner { width: 50px; height: 50px; border: 4px solid #ecf0f1; border-top-color: #3498db; border-radius: 50%; }',
    answer: '.spinner {\n  animation: spin 1s linear infinite;\n}',
    requiredElements: ['animation', 'spin', '1s', 'linear', 'infinite']
  },
  {
    level: 3,
    title: 'イージング関数',
    description: 'ease-in-outでスムーズに',
    task: 'バウンスアニメーションにease-in-outイージングを適用してください。',
    hint: 'animation-timing-functionまたはanimation短縮形で指定',
    type: 'css',
    previewHtml: '<div class="bounce-ball"></div>',
    previewCss: '@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-50px); } } .bounce-ball { width: 50px; height: 50px; background: #f39c12; border-radius: 50%; }',
    answer: '.bounce-ball {\n  animation: bounce 0.6s ease-in-out infinite;\n}',
    requiredElements: ['animation', 'bounce', 'ease-in-out', 'infinite']
  },
  {
    level: 4,
    title: 'シェイクアニメーション',
    description: '横に揺れる効果',
    task: 'shakeキーフレームを作成。左右に10pxずつ揺れる動きを作ってください。',
    hint: 'translateXを使って複数の%で左右に動かします',
    type: 'css',
    previewHtml: '<button class="shake-btn">エラー！</button>',
    previewCss: '.shake-btn { padding: 15px 30px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; animation: shake 0.5s; }',
    answer: '@keyframes shake {\n  0%, 100% {\n    transform: translateX(0);\n  }\n  20%, 60% {\n    transform: translateX(-10px);\n  }\n  40%, 80% {\n    transform: translateX(10px);\n  }\n}',
    requiredElements: ['@keyframes', 'shake', 'translatex', '-10px', '10px', '0%', '100%']
  },
  {
    level: 4,
    title: 'animation-delay',
    description: '遅延アニメーション',
    task: '3つのドットに順番にアニメーションを適用。それぞれ0s、0.2s、0.4sの遅延。',
    hint: 'animation-delay: 0.2s; で遅延を設定',
    type: 'css',
    previewHtml: '<div class="dots"><span class="dot dot1"></span><span class="dot dot2"></span><span class="dot dot3"></span></div>',
    previewCss: '@keyframes dotPulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.5); opacity: 1; } } .dots { display: flex; gap: 10px; } .dot { width: 20px; height: 20px; background: #3498db; border-radius: 50%; animation: dotPulse 1s infinite; }',
    answer: '.dot1 {\n  animation-delay: 0s;\n}\n\n.dot2 {\n  animation-delay: 0.2s;\n}\n\n.dot3 {\n  animation-delay: 0.4s;\n}',
    requiredElements: ['animation-delay', '0s', '0.2s', '0.4s', '.dot1', '.dot2', '.dot3']
  },
  {
    level: 4,
    title: 'タイピングアニメーション',
    description: 'タイプライター効果',
    task: 'テキストが1文字ずつ表示されるタイピングアニメーションを作成。',
    hint: 'width: 0からwidth: 100%へ、steps()で段階的に',
    type: 'css',
    previewHtml: '<p class="typing">Hello, World!</p>',
    previewCss: '.typing { font-family: monospace; font-size: 24px; white-space: nowrap; overflow: hidden; border-right: 2px solid #333; width: 13ch; }',
    answer: '@keyframes typing {\n  from {\n    width: 0;\n  }\n  to {\n    width: 13ch;\n  }\n}\n\n@keyframes blink {\n  50% {\n    border-color: transparent;\n  }\n}\n\n.typing {\n  animation: typing 2s steps(13), blink 0.5s step-end infinite;\n}',
    requiredElements: ['@keyframes', 'typing', 'width', 'steps', 'animation', 'blink']
  },
  {
    level: 4,
    title: 'グラデーションアニメーション',
    description: '背景グラデーションを動かす',
    task: '背景のグラデーションが左右に動くアニメーションを作成。',
    hint: 'background-sizeを大きくしてbackground-positionをアニメーション',
    type: 'css',
    previewHtml: '<div class="gradient-box">グラデーション</div>',
    previewCss: '.gradient-box { padding: 40px; color: white; text-align: center; border-radius: 8px; background: linear-gradient(90deg, #3498db, #9b59b6, #e74c3c, #3498db); background-size: 300% 100%; }',
    answer: '@keyframes gradientMove {\n  0% {\n    background-position: 0% 50%;\n  }\n  50% {\n    background-position: 100% 50%;\n  }\n  100% {\n    background-position: 0% 50%;\n  }\n}\n\n.gradient-box {\n  animation: gradientMove 3s ease infinite;\n}',
    requiredElements: ['@keyframes', 'gradientmove', 'background-position', 'animation', 'infinite']
  },
  {
    level: 5,
    title: 'animation-fill-mode',
    description: 'アニメーション終了後の状態を維持',
    task: 'フェードインアニメーション後、opacity: 1の状態を維持してください。',
    hint: 'animation-fill-mode: forwards; で終了状態を維持',
    type: 'css',
    previewHtml: '<div class="fill-box">表示されます</div>',
    previewCss: '@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .fill-box { padding: 30px; background: #27ae60; color: white; text-align: center; border-radius: 8px; opacity: 0; }',
    answer: '.fill-box {\n  animation: fadeIn 1s ease forwards;\n}',
    requiredElements: ['animation', 'fadein', 'forwards']
  },
  {
    level: 5,
    title: '3D回転',
    description: 'カードフリップ効果',
    task: 'カードがhover時にY軸で180度回転する3Dフリップを作成。',
    hint: 'rotateY(180deg)とperspectiveを使用',
    type: 'css',
    previewHtml: '<div class="flip-card"><div class="flip-inner"><div class="flip-front">表</div><div class="flip-back">裏</div></div></div>',
    previewCss: '.flip-card { width: 150px; height: 200px; perspective: 1000px; cursor: pointer; } .flip-inner { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; } .flip-front, .flip-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; font-size: 24px; border-radius: 12px; } .flip-front { background: #3498db; color: white; } .flip-back { background: #e74c3c; color: white; transform: rotateY(180deg); }',
    answer: '.flip-inner {\n  transition: transform 0.6s;\n}\n\n.flip-card:hover .flip-inner {\n  transform: rotateY(180deg);\n}',
    requiredElements: ['transition', 'transform', ':hover', 'rotatey', '180deg']
  },
  {
    level: 5,
    title: 'スクロールトリガー風',
    description: 'JSでアニメーションクラスを付与',
    task: 'ボタンクリックで.boxにanimateクラスを追加し、アニメーションを開始させてください。',
    hint: 'classList.add()でクラスを追加',
    type: 'dom',
    previewHtml: '<button id="triggerBtn">アニメーション開始</button><div class="box" id="animBox">アニメーション対象</div>',
    previewCss: '@keyframes slideUp { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } } .box { padding: 40px; background: #9b59b6; color: white; text-align: center; border-radius: 8px; margin-top: 20px; opacity: 0; } .box.animate { animation: slideUp 0.5s ease forwards; } button { padding: 15px 30px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; }',
    starter: 'const btn = document.querySelector("#triggerBtn");\nconst box = document.querySelector("#animBox");',
    answer: 'const btn = document.querySelector("#triggerBtn");\nconst box = document.querySelector("#animBox");\n\nbtn.addEventListener("click", () => {\n  box.classList.add("animate");\n});',
    requiredElements: ['addeventlistener', 'click', 'classlist', 'add', 'animate']
  },
  {
    level: 6,
    title: 'パーティクルアニメーション',
    description: '複数要素を動的にアニメーション',
    task: 'クリックした位置にパーティクルを生成し、ランダムな方向に飛び散らせてください。',
    hint: 'ランダムなtranslateとopacityのアニメーション',
    type: 'dom',
    previewHtml: '<div id="container" style="height: 300px; background: #2c3e50; border-radius: 8px; position: relative; overflow: hidden; cursor: crosshair;"></div>',
    previewCss: '.particle { position: absolute; width: 10px; height: 10px; border-radius: 50%; pointer-events: none; animation: particleFade 1s ease-out forwards; } @keyframes particleFade { to { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0); } }',
    starter: 'const container = document.querySelector("#container");\nconst colors = ["#e74c3c", "#3498db", "#27ae60", "#f39c12", "#9b59b6"];',
    answer: 'const container = document.querySelector("#container");\nconst colors = ["#e74c3c", "#3498db", "#27ae60", "#f39c12", "#9b59b6"];\n\ncontainer.addEventListener("click", (e) => {\n  const rect = container.getBoundingClientRect();\n  const x = e.clientX - rect.left;\n  const y = e.clientY - rect.top;\n  \n  for (let i = 0; i < 12; i++) {\n    const particle = document.createElement("div");\n    particle.className = "particle";\n    particle.style.left = x + "px";\n    particle.style.top = y + "px";\n    particle.style.background = colors[Math.floor(Math.random() * colors.length)];\n    \n    const angle = (Math.PI * 2 * i) / 12;\n    const distance = 50 + Math.random() * 50;\n    particle.style.setProperty("--tx", Math.cos(angle) * distance + "px");\n    particle.style.setProperty("--ty", Math.sin(angle) * distance + "px");\n    \n    container.appendChild(particle);\n    \n    setTimeout(() => particle.remove(), 1000);\n  }\n});',
    requiredElements: ['addeventlistener', 'click', 'createelement', 'classname', 'math.random', 'math.cos', 'math.sin', 'setproperty', 'appendchild', 'settimeout', 'remove']
  }
];

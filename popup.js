document.getElementById("export").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const url = new URL(tab.url);
  // ID取得
  const parts = url.pathname.split("/").filter(Boolean);
  const noteid = parts.pop();

  // xxxx/noteid/downloadでmd落とす
  const apiUrl = `${url.origin}/${noteid}/download`;
  const md = await fetch(apiUrl).then(r => r.text()).catch(e => {
    alert("md取得失敗");
  });

  if (!md) return;

  const firstContentLine = md.split(/\r?\n/).find(line => line.trim().length > 0) || '';
  const sanitizedTitle = firstContentLine
    .replace(/^#+\s*/, '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 120);
  const pdfFileName = sanitizedTitle || noteid || 'document';

  try {
    // MarkdownをHTMLに変換
    const htmlContent = marked.parse(md);

    // PDF変換用のHTMLを作成
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>PDF Export</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html {
            font-size: 14px !important;
          }
          body {
            font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif !important;
            font-size: 14px !important;
            line-height: 1.8;
            color: #333;
            background: #fff;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            overflow-wrap: break-word;
            word-wrap: break-word;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.8em;
            font-weight: 700;
            line-height: 1.4;
          }
          h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
          h2 { font-size: 1.6em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
          h3 { font-size: 1.3em; }
          h4 { font-size: 1.1em; }
          p {
            font-size: 14px !important;
            margin-bottom: 1em;
          }
          ul, ol {
            margin-left: 2em;
            margin-bottom: 1em;
          }
          li {
            font-size: 14px !important;
            margin-bottom: 0.5em;
          }
          div, span {
            font-size: 14px !important;
          }
          code {
            font-family: "Courier New", "Monaco", "Consolas", monospace;
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
            border: 1px solid #dcdcdc;
            color: #333333;
          }
          pre {
            background-color: #f5f5f5;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            overflow-wrap: break-word;
            word-wrap: break-word;
            max-width: 100%;
            margin-bottom: 1em;
            border: 1px solid #dcdcdc;
            border-left: 4px solid #999999;
            box-sizing: border-box;
          }
          pre code {
            background-color: transparent;
            padding: 0;
            border: none;
            color: #24292e;
            font-size: 0.9em;
          }
          blockquote {
            font-size: 14px !important;
            border-left: 4px solid #bfbfbf;
            background-color: #f2f2f2;
            padding: 0 16px;
            margin-left: 0;
            margin-right: 0;
            color: #333;
            margin-bottom: 1em;
            max-width: 100%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            box-sizing: border-box;
          }
          blockquote p {
            margin-bottom: 0.5em;
          }
          blockquote p:last-child {
            margin-bottom: 0;
          }
          table {
            border-collapse: collapse;
            width: auto;
            max-width: 100%;
            margin-bottom: 1em;
            border: 1px solid #bfbfbf;
            table-layout: auto;
            background-color: #fff;
          }
          th, td {
            font-size: 14px !important;
            border: 1px solid #bfbfbf;
            padding: 8px 12px;
            text-align: left;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          th {
            background-color: #f0f0f0;
            font-weight: 600;
            border-bottom: 1px solid #bfbfbf;
            color: #222;
          }
          img {
            max-width: 100%;
            height: auto;
            margin: 1em 0;
          }
          a {
            color: #1f6ad6;
            text-decoration: none;
            outline: none;
            border: none;
          }
          a:visited,
          a:active,
          a:focus {
            color: #1f6ad6;
            outline: none;
            border: none;
          }
          a:hover {
            text-decoration: underline;
            text-decoration-color: #1f6ad6;
          }
          hr {
            border: none;
            border-top: 2px solid #eaecef;
            margin: 2em 0;
            height: 0;
          }
          strong {
            font-weight: 700;
          }
          em {
            font-style: italic;
          }
          del {
            text-decoration: line-through;
            color: #6a737d;
          }
        </style>
      </head>
      <body>${htmlContent}</body>
      </html>
    `;

    // iframeを作成してHTMLを表示
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '800px';
    iframe.style.height = '10000px';
    document.body.appendChild(iframe);

    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    
    iframe.src = blobUrl;

    // iframeの読み込み
    await new Promise((resolve) => {
      iframe.onload = resolve;
    });

    // フォントの読み込み
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // JSでスタイルを適用
    const doc = iframe.contentDocument;
    const bodyElement = doc.body;
    const htmlElement = doc.documentElement;
    
    htmlElement.style.fontSize = '14px';
    bodyElement.style.fontSize = '14px';
    bodyElement.style.fontFamily = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif';
    bodyElement.style.overflowWrap = 'break-word';
    bodyElement.style.wordWrap = 'break-word';
    
    // テキスト要素にフォントサイズを適用
    const allElements = bodyElement.querySelectorAll('p, li, td, th, div, span, blockquote');
    allElements.forEach(el => {
      if (!el.matches('h1, h2, h3, h4, h5, h6') && !el.closest('h1, h2, h3, h4, h5, h6')) {
        if (!el.style.fontSize) {
          el.style.fontSize = '14px';
        }
      }
      // はみ出し防止のスタイルを適用
      el.style.boxSizing = 'border-box';
      if (!el.matches('table, th, td')) {
        el.style.maxWidth = '100%';
        el.style.overflowWrap = 'break-word';
        el.style.wordWrap = 'break-word';
      }
    });
    
    // 表のスタイルを適用
    const tables = bodyElement.querySelectorAll('table');
    const tableSizePromises = Array.from(tables).map(table => {
      return new Promise((resolve) => {
        table.style.borderCollapse = 'collapse';
        table.style.maxWidth = '100%';
        table.style.marginBottom = '1em';
        table.style.border = '1px solid #bfbfbf';
        table.style.backgroundColor = '#ffffff';
        table.style.tableLayout = 'auto';
        table.style.boxSizing = 'border-box';
        
        // 親要素の幅を取得
        const parentElement = table.parentElement;
        const parentWidth = parentElement ? parentElement.clientWidth : 800;
        
        // セルの最小幅を計算
        const cells = table.querySelectorAll('th, td');
        cells.forEach(cell => {
          cell.style.fontSize = '14px';
          cell.style.border = '1px solid #bfbfbf';
          cell.style.padding = '8px 12px';
          cell.style.textAlign = 'left';
          cell.style.boxSizing = 'border-box';
          cell.style.whiteSpace = 'nowrap';
        });
          table.style.width = 'auto';
        
        // レイアウトを再計算させるためにrequestAnimationFrameを使用
        const calculateTableSize = () => {
          void table.offsetWidth;
          const tableNaturalWidth = table.scrollWidth;
          // 表の自然な幅が親要素を超える場合
          if (tableNaturalWidth > parentWidth) {
            table.style.width = '100%';
            table.style.tableLayout = 'fixed';
            const rows = table.querySelectorAll('tr');
            if (rows.length > 0) {
              const firstRow = rows[0];
              const firstRowCells = firstRow.querySelectorAll('th, td');
              const columnCount = firstRowCells.length;
              const columnMinWidths = [];
              
              // 各列の最小幅を計算
              for (let colIndex = 0; colIndex < columnCount; colIndex++) {
                let maxMinWidth = 0;
                rows.forEach(row => {
                  const cell = row.querySelectorAll('th, td')[colIndex];
                  if (cell) {
                    // 最小幅を測定
                    const originalWhiteSpace = cell.style.whiteSpace;
                    cell.style.whiteSpace = 'nowrap';
                    // レイアウトを再計算
                    void cell.offsetWidth;
                    const minWidth = cell.scrollWidth;
                    cell.style.whiteSpace = originalWhiteSpace;
                    maxMinWidth = Math.max(maxMinWidth, minWidth);
                  }
                });
                columnMinWidths.push(maxMinWidth);
              }
              
              // 合計最小幅を計算
              const totalMinWidth = columnMinWidths.reduce((sum, width) => sum + width, 0);
              
              // 各列に幅を割り当て
              if (totalMinWidth > 0) {
                firstRowCells.forEach((cell, colIndex) => {
                  const minWidth = columnMinWidths[colIndex];
                  const percentage = (minWidth / totalMinWidth) * 100;
                  cell.style.width = `${percentage}%`;
                });
              }
            }
          } else {
            table.style.width = 'auto';
            table.style.tableLayout = 'auto';
          }
          
          // 折り返しスタイルを適用
          cells.forEach(cell => {
            cell.style.whiteSpace = 'normal';
            cell.style.wordWrap = 'break-word';
            cell.style.overflowWrap = 'break-word';
          });
          
          resolve();
        };
        
        // レイアウト計算を実行
        requestAnimationFrame(() => {
          requestAnimationFrame(calculateTableSize);
        });
      });
    });
    
    // すべての表のサイズ計算が完了するまで待機
    await Promise.all(tableSizePromises);
    
    // 表のセルにスタイルを適用
    const tableCells = bodyElement.querySelectorAll('th, td');
    tableCells.forEach(cell => {
      if (!cell.style.fontSize) {
        cell.style.fontSize = '14px';
      }
      if (!cell.style.border) {
        cell.style.border = '1px solid #bfbfbf';
      }
      if (!cell.style.padding) {
        cell.style.padding = '8px 12px';
      }
      if (!cell.style.textAlign) {
        cell.style.textAlign = 'left';
      }
      if (!cell.style.boxSizing) {
        cell.style.boxSizing = 'border-box';
      }
    });
    
    // 表の見出し行にスタイルを適用
    const tableHeaders = bodyElement.querySelectorAll('th');
    tableHeaders.forEach(th => {
      th.style.backgroundColor = '#f0f0f0';
      th.style.fontWeight = '600';
      th.style.borderBottom = '1px solid #bfbfbf';
      th.style.color = '#222222';
    });
    
    // 引用にスタイルを適用
    const blockquotes = bodyElement.querySelectorAll('blockquote');
    blockquotes.forEach(blockquote => {
      blockquote.style.fontSize = '14px';
      blockquote.style.borderLeft = '4px solid #bfbfbf';
      blockquote.style.backgroundColor = '#f2f2f2';
      blockquote.style.padding = '0 16px';
      blockquote.style.marginLeft = '0';
      blockquote.style.marginRight = '0';
      blockquote.style.color = '#333333';
      blockquote.style.marginBottom = '1em';
      blockquote.style.maxWidth = '100%';
      blockquote.style.wordWrap = 'break-word';
      blockquote.style.overflowWrap = 'break-word';
      blockquote.style.boxSizing = 'border-box';
    });
    
    // コードブロックにスタイルを適用
    const codeBlocks = bodyElement.querySelectorAll('pre');
    codeBlocks.forEach(pre => {
      pre.style.backgroundColor = '#f5f5f5';
      pre.style.padding = '16px';
      pre.style.borderRadius = '6px';
      pre.style.overflowX = 'auto';
      pre.style.overflowWrap = 'break-word';
      pre.style.wordWrap = 'break-word';
      pre.style.maxWidth = '100%';
      pre.style.marginBottom = '1em';
      pre.style.border = '1px solid #dcdcdc';
      pre.style.borderLeft = '4px solid #999999';
      pre.style.boxSizing = 'border-box';
    });
    
    // インラインコードにスタイルを適用
    const inlineCodes = bodyElement.querySelectorAll('code:not(pre code)');
    inlineCodes.forEach(code => {
      code.style.fontFamily = '"Courier New", "Monaco", "Consolas", monospace';
      code.style.backgroundColor = '#f5f5f5';
      code.style.padding = '2px 6px';
      code.style.borderRadius = '3px';
      code.style.fontSize = '0.9em';
      code.style.border = '1px solid #dcdcdc';
      code.style.color = '#333333';
    });
    
    // リンクにスタイルを適用
    const links = bodyElement.querySelectorAll('a');
    links.forEach(link => {
      link.style.color = '#1f6ad6';
      link.style.textDecoration = 'none';
      link.style.outline = 'none';
      link.style.border = 'none';
    });
    
    // pre内のcodeは別
    const preCodes = bodyElement.querySelectorAll('pre code');
    preCodes.forEach(code => {
      code.style.backgroundColor = 'transparent';
      code.style.padding = '0';
      code.style.border = 'none';
      code.style.color = '#24292e';
      code.style.fontSize = '0.9em';
    });
    
    // 水平線にスタイルを適用
    const horizontalRules = bodyElement.querySelectorAll('hr');
    horizontalRules.forEach(hr => {
      hr.style.border = 'none';
      hr.style.borderTop = '2px solid #eaecef';
      hr.style.margin = '2em 0';
      hr.style.height = '0';
    });
    
    // html2pdf.jsでPDF化
    const element = bodyElement;
    
    const deviceScale = Math.min(window.devicePixelRatio || 1, 3);
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `${pdfFileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: deviceScale * 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true,
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    await html2pdf().set(opt).from(element).save();

    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(blobUrl);
    }, 1000);

  } catch (error) {
    console.error('error:', error);
    alert('PDF変換に失敗: ' + error.message);
  }
});
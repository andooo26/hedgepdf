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
          body {
            font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
            font-size: 14px;
            line-height: 1.8;
            color: #333;
            background: #fff;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
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
            margin-bottom: 1em;
          }
          ul, ol {
            margin-left: 2em;
            margin-bottom: 1em;
          }
          li {
            margin-bottom: 0.5em;
          }
          code {
            font-family: "Courier New", "Monaco", "Consolas", monospace;
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
          }
          pre {
            background-color: #f5f5f5;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
            margin-bottom: 1em;
            border-left: 4px solid #ddd;
          }
          pre code {
            background-color: transparent;
            padding: 0;
          }
          blockquote {
            border-left: 4px solid #ddd;
            padding-left: 1em;
            margin-left: 0;
            color: #666;
            margin-bottom: 1em;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 1em;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: 700;
          }
          img {
            max-width: 100%;
            height: auto;
            margin: 1em 0;
          }
          a {
            color: #0066cc;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          hr {
            border: none;
            border-top: 1px solid #eee;
            margin: 2em 0;
          }
        </style>
      </head>
      <body>${htmlContent}</body>
      </html>
    `;

    // iframeを用いてHTML
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
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // html2canvasで画像化
    const canvas = await html2canvas(iframe.contentDocument.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 800,
      windowWidth: 800,
    });

    // jsPDFでPDF化
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    // A4サイズ
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // 最初のページを追加
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 複数ページに対応
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // PDFをダウンロード
    pdf.save(`${noteid || 'document'}.pdf`);

    // クリーンアップ
    document.body.removeChild(iframe);
    URL.revokeObjectURL(blobUrl);

  } catch (error) {
    console.error('PDF変換エラー:', error);
    alert('PDF変換に失敗しました: ' + error.message);
  }
});
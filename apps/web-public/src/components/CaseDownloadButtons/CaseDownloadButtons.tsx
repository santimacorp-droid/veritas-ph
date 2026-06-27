'use client';

interface CaseDownloadButtonsProps {
  caseId: string;
  btnPrimary?: string;
  btnSecondary?: string;
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  } catch (err) {
    alert('Download failed. Please try again.');
    console.error(err);
  }
}

export default function CaseDownloadButtons({ caseId, btnPrimary, btnSecondary }: CaseDownloadButtonsProps) {
  return (
    <>
      <button
        onClick={() => downloadFile(`/api/exports/case/${caseId}.json`, `case-${caseId}.json`)}
        className={`${btnPrimary ?? ''} font-ui`}
        style={{ cursor: 'pointer' }}
      >
        Download Case Dossier (JSON)
      </button>
      <button
        onClick={() => downloadFile(`/api/exports/case/${caseId}.csv`, `case-${caseId}.csv`)}
        className={`${btnSecondary ?? ''} font-ui`}
        style={{ cursor: 'pointer' }}
      >
        Download (CSV)
      </button>
    </>
  );
}

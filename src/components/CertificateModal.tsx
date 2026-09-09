import { X, Printer, Award, CheckCircle2 } from "lucide-react";

interface CertificateModalProps {
  cert: {
    courseTitle: string;
    tierTitle: string;
    pct: number;
    issuedAt: string;
    expiresAt: string | null;
  };
  displayName: string;
  onClose: () => void;
}

export function CertificateModal({ cert, displayName, onClose }: CertificateModalProps) {
  const printCertificate = () => {
    const html = `
<!DOCTYPE html>
<html>
<head><title>Certificate of Completion</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; margin: 0; }
  .sheet { width: 100%; min-height: 100vh; padding: 40px; position: relative;
           border: 14px double #C8A951; background: #FFFDF7; color: #3a2a1a; }
  .inner { border: 1px solid #C8A951; padding: 26px 36px; text-align: center; }
  .brand img { height: 64px; }
  .brand { display:flex; align-items:center; justify-content:center; gap:14px; }
  .co { color:#5C3A1E; font-weight:bold; font-size:22px; letter-spacing:2px; }
  .tag { color:#8a6a2f; font-size:11px; letter-spacing:4px; text-transform: uppercase; }
  .kicker { margin-top:26px; color:#8a6a2f; letter-spacing:5px; text-transform: uppercase; font-size:12px; }
  .name { font-size:44px; font-weight:bold; margin:14px 0 4px; color:#5C3A1E; }
  .body { color:#5b4a33; font-size:16px; line-height:1.7; }
  .course { color:#5C3A1E; font-weight:bold; font-size:22px; margin:6px auto; max-width:640px; }
  .tier { display:inline-block; margin-top:14px; padding:8px 26px; border-radius:999px;
          background:#C8A951; color:#fff; font-size:14px; letter-spacing:2px; text-transform: uppercase; }
  .pct { font-size:13px; color:#8a6a2f; margin-top:6px; }
  .meta { margin-top:28px; display:flex; justify-content:center; gap:70px; font-size:13px; color:#5b4a33; }
  .meta b { display:block; border-top:1px solid #C8A951; padding-top:6px; margin-top:6px; font-weight:normal;
            color:#3a2a1a; min-width:140px; }
</style>
</head>
<body>
  <div class="sheet"><div class="inner">
    <div class="brand">
      <img src="${window.location.origin}/assets/12.png" alt="Safarilink" />
      <div style="text-align:left">
        <div class="co">SAFARILINK</div>
        <div class="tag">HR Compliance &amp; Training</div>
      </div>
    </div>
    <div class="kicker">Certificate of Completion</div>
    <div class="name">${displayName}</div>
    <div class="body">has successfully completed the course</div>
    <div class="course">${cert.courseTitle}</div>
    <div class="tier">${cert.tierTitle || "Passed"}</div>
    <div class="pct">Final score: ${cert.pct}%</div>
    <div class="meta">
      <div>Issued on<b>${new Date(cert.issuedAt).toLocaleDateString()}</b></div>
      <div>Valid through<b>${cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : "No expiry"}</b></div>
    </div>
  </div></div>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { iframe.remove(); return; }
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1500);
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center backdrop-blur-xs p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-sf-cream-dark">
          <h3 className="text-lg font-bold text-sf-brown flex items-center gap-2">
            <Award className="w-5 h-5 text-sf-gold" /> Certificate
          </h3>
          <div className="flex items-center gap-1.5">
            <button onClick={printCertificate} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-6 bg-slate-100">
          <div className="rounded-lg bg-[#FFFDF7] border-[10px] double border-sf-gold shadow-lg overflow-hidden">
            <div className="border border-sf-gold px-6 py-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <img src="/assets/12.png" alt="Safarilink" className="h-12" />
                <div className="text-left">
                  <p className="font-serif font-bold text-sf-brown text-xl tracking-wider">SAFARILINK</p>
                  <p className="text-[10px] tracking-[0.3em] text-sf-gold-dark uppercase">HR Compliance &amp; Training</p>
                </div>
              </div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400 mb-2">Certificate of Completion</p>
              <p className="font-serif text-3xl font-bold text-sf-brown mb-1">{displayName}</p>
              <p className="text-sm text-slate-500 mb-3">has successfully completed the course</p>
              <p className="font-serif text-xl font-bold text-sf-brown">{cert.courseTitle}</p>
              <span className="inline-flex items-center gap-1.5 mt-4 px-5 py-1.5 rounded-full bg-sf-gold text-white text-xs font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-4 h-4" /> {cert.tierTitle || "Passed"}
              </span>
              <p className="text-[11px] text-slate-400 mt-1.5">Final score: {cert.pct}%</p>
              <div className="flex justify-center gap-10 mt-6 text-[11px] text-slate-500">
                <div>Issued on<b className="block border-t border-sf-gold pt-1 mt-1 text-slate-700">{new Date(cert.issuedAt).toLocaleDateString()}</b></div>
                <div>Valid through<b className="block border-t border-sf-gold pt-1 mt-1 text-slate-700">{cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : "No expiry"}</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

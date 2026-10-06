import { Icon } from "./icon";

export function WorkflowPreview() {
  return (
    <div className="workflow-preview" aria-label="Örnek otomasyon: müşteri talebi alınır, AI ile sınıflandırılır ve ilgili ekibe iletilir.">
      <div className="preview-heading"><span><span className="status-dot" /> ÖRNEK İŞ AKIŞI</span><span className="preview-tag">Otomasyon</span></div>
      <div className="workflow-node"><span className="node-icon"><Icon name="mail" /></span><div><span className="node-step">TETİKLEYİCİ</span><strong>Yeni müşteri talebi</strong><small>Form üzerinden alındı</small></div><Icon name="check" className="node-check" /></div>
      <div className="connector"><span>Veri aktarılır</span></div>
      <div className="workflow-node featured"><span className="node-icon"><Icon name="spark" /></span><div><span className="node-step">AI DESTEKLİ ADIM</span><strong>Talebi sınıflandır</strong><small>İçeriği analiz et, doğru ekibi bul</small></div><Icon name="check" className="node-check" /></div>
      <div className="connector"><span>İlgili ekibe yönlendirilir</span></div>
      <div className="workflow-node"><span className="node-icon"><Icon name="workflow" /></span><div><span className="node-step">AKSİYON</span><strong>Ekibine haber ver</strong><small>Bildirim ve görev oluştur</small></div><Icon name="check" className="node-check" /></div>
      <div className="preview-footer"><span><Icon name="check" /> Daha az manuel adım</span><span>Daha çok odak.</span></div>
    </div>
  );
}

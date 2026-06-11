export const WHATSAPP_HEALTH_CHECKUP_REPORT_TEMPLATE_ID = "tp_health_checkup_report";

export const HEALTH_CHECKUP_REPORT_TEMPLATE_HTML = `<div class="report-doc-header">
  <img src="/ZydusLogo.png" alt="Hospital Logo" class="report-doc-header-logo" />
  <p class="report-doc-header-title">HEALTH CHECK-UP SUMMARY</p>
</div>
<table class="report-patient-table">
  <tr><td colspan="2"><p class="report-divider">&#8203;</p></td></tr>
  <tr>
    <td class="report-patient-left">
      <p>Patient Name: <strong>______________</strong></p>
      <p>Age/Gender: ______________</p>
      <p>Contact No: ______________</p>
    </td>
    <td class="report-patient-right">
      <p>Date: <strong>______________</strong></p>
      <p>MRN: <strong>______________</strong></p>
      <p>Package Details: <strong></strong></p>
    </td>
  </tr>
  <tr><td colspan="2"><p class="report-divider">&#8203;</p></td></tr>
</table>

<h2 class="report-section-title">Chief Complaints:</h2>
<table class="report-section-box"><tbody><tr><td><p><br></p></td></tr></tbody></table>

<h2 class="report-section-title">Patient History</h2>
<table class="report-data-table">
  <tbody>
    <tr><td><p>Medical Condition</p></td><td><p></p></td></tr>
    <tr><td><p>Allergies</p></td><td><p></p></td></tr>
    <tr><td><p>Lifestyle</p></td><td><p></p></td></tr>
    <tr><td><p>Family History</p></td><td><p></p></td></tr>
    <tr><td><p>Surgical History</p></td><td><p></p></td></tr>
    <tr><td><p>Additional History</p></td><td><p></p></td></tr>
  </tbody>
</table>

<h2 class="report-section-title">General Examination</h2>
<table class="report-data-table report-general-exam-grid top-row-grid">
  <tbody>
    <tr>
      <th><p>Temp</p></th><td><p></p></td>
      <th><p>BP</p></th><td><p></p></td>
      <th><p>SPO2</p></th><td><p></p></td>
      <th><p>RR</p></th><td><p></p></td>
      <th><p>Pulse</p></th><td><p></p></td>
    </tr>
  </tbody>
</table>
<table class="report-data-table report-general-exam-grid bottom-row-grid" style="margin-top: 24px;">
  <tbody>
    <tr>
      <th><p>Weight</p></th><td><p></p></td>
      <th><p>Height</p></th><td><p></p></td>
      <th><p>BMI</p></th><td><p></p></td>
    </tr>
  </tbody>
</table>

<h2 class="report-section-title">RADIOLOGY / SONOLOGY IMAGING FINDINGS</h2>
<table class="report-data-table">
  <thead><tr><th><p>Modality</p></th><th><p>Impressions</p></th></tr></thead>
  <tbody>
    <tr><td><p>X ray Chest</p></td><td><p></p></td></tr>
    <tr><td><p>USG Whole Abdomen</p></td><td><p></p></td></tr>
    <tr><td><p>Mammography</p></td><td><p></p></td></tr>
    <tr><td><p>BMD</p></td><td><p></p></td></tr>
    <tr><td><p>CT Coronary Angio</p></td><td><p></p></td></tr>
    <tr><td><p>Carotid Colour Doppler</p></td><td><p></p></td></tr>
    <tr><td><p>MRI</p></td><td><p></p></td></tr>
  </tbody>
</table>

<h2 class="report-section-title">Consultations</h2>
<table class="report-data-table report-consultations">
  <thead><tr><th><p>DEPARTMENT & DOCTOR NAME</p></th><th><p>NOTES</p></th></tr></thead>
  <tbody>
    <tr><td><p>Ophthalmologist</p></td><td><p></p></td></tr>
    <tr><td><p>Dentist</p></td><td><p></p></td></tr>
    <tr><td><p>ENT Surgeon</p></td><td><p></p></td></tr>
    <tr><td><p>Orthopaedic Surgeon</p></td><td><p></p></td></tr>
    <tr><td><p>Gynaecology</p></td><td><p></p></td></tr>
    <tr><td><p>Dermatology</p></td><td><p></p></td></tr>
    <tr><td><p>Cardiologist</p></td><td><p></p></td></tr>
    <tr><td><p>Paediatric</p></td><td><p></p></td></tr>
    <tr><td><p>Physician</p></td><td><p></p></td></tr>
  </tbody>
</table>

<h2 class="report-section-title">Impression (Dr. ______________)</h2>
<table class="report-section-box"><tbody><tr><td><p><br></p></td></tr></tbody></table>

<h2 class="report-section-title">Advice</h2>
<table class="report-section-box"><tbody><tr><td><p><br></p></td></tr></tbody></table>

<h2 class="report-section-title">General Recommendations</h2>
<table class="report-section-box report-general-rec"><tbody><tr><td><p>Regular health check ups can identify any early warning signs of major health issues. When you have a health check up, your doctor will talk to you about your and your family's medical history, enlisting your lifestyle and conditions including your diet, weight, physical activity, alcohol use and smoking habits etc. Your doctor may include health check up as an advice even if you are here for any other illnesses. Team of Zydus hospitals is grateful to you for your trust in us and we shall do our best to assure your complete well being.</p></td></tr></tbody></table>

<table class="report-data-table">
  <thead><tr><th><p>PREPARED BY</p></th><th><p>DATE</p></th></tr></thead>
  <tbody><tr><td><p></p></td><td><p></p></td></tr></tbody>
  <thead><tr><th><p>VERIFIED BY</p></th><th><p>DATE</p></th></tr></thead>
  <tbody><tr><td><p></p></td><td><p></p></td></tr></tbody>
</table>
`.trim();

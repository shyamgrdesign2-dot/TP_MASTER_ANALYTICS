# IPD Reports: backend API spec

## Backend notes (IPD Reports)
- All register cards reuse the superset ipd/* endpoints via the card.block extractor (IPD_REPORT_CARDS in analyticsPages.js): ipd/admissions -> admissionRegister | dischargeRegister | queueRegister | losRegister; ipd/wards -> transfersRegister; ipd/clinical -> otRegister.
- IPD Bills: card.source="billing-ipd" -> fetchBillingDashboard(params, "ipd") -> billsTable (client-side export).
- IPD Outstanding Dues: financial/summary?careSetting=ipd block patientDues (debit-doc filtered).
- No new endpoints were needed: the superset rule paid off, every register already rides an existing response.

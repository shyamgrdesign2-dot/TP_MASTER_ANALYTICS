/**
 * Default Print Settings for Ophthalmology Module
 * 
 * View values:
 * 1 = inline
 * 2 = listview  
 * 3 = table (default)
 */
export const ophthalmologyDefaultPrintSettings = {
    "id": "ophthalmology",
    "label": "Ophthal Details",
    "order": 1,
    "visible": true,
    "isCustom": false,
    "view": 3, // Default to table view
    "subSections": [
        {
            "id": "visualAcuity",
            "label": "Visual Acuity Test",
            "order": 1,
            "visible": true,
            "view": 3
        },
        {
            "id": "autoRefraction",
            "label": "Auto Refraction Test",
            "order": 2,
            "visible": true,
            "view": 3,
            "subSections": [
                {
                    "id": "undilated",
                    "label": "Undilated",
                    "order": 1,
                    "visible": true,
                    "view": 3
                },
                {
                    "id": "dilated",
                    "label": "Dilated",
                    "order": 2,
                    "visible": true,
                    "view": 3
                }
            ]
        },
        {
            "id": "lensometerValues",
            "label": "Lensometer Values",
            "order": 3,
            "visible": true,
            "view": 3
        },
        {
            "id": "glassPrescription",
            "label": "Glass Prescription",
            "order": 4,
            "visible": true,
            "view": 3
        },
        {
            "id": "intraOcularPressure",
            "label": "Intra Ocular Pressure",
            "order": 5,
            "visible": true,
            "view": 3
        },
        {
            "id": "slitLampExamination",
            "label": "Slit Lamp Examination",
            "order": 6,
            "visible": true,
            "view": 3
        },
        {
            "id": "fundusExamination",
            "label": "Fundus Examination",
            "order": 7,
            "visible": true,
            "view": 3
        }
    ]
};

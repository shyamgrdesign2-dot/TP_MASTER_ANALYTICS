import { createElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDF } from './PDF'

export const renderPDF = async (props) => {
    // const { pdf } = await import('@react-pdf/renderer');
    // const { PDF } = await import('./PDF');
    return pdf(createElement(PDF, props)).toBlob();
};
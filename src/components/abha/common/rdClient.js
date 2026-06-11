import CryptoJS from 'crypto-js';

const DISCOVERY_TIMEOUT = 5000;
const CAPTURE_TIMEOUT = 35000;
const PORT_RANGE_START = 11100;
const PORT_RANGE_END = 11120;

/**
 * Generate WADH using Mantra formula for ABHA compliance
 * Formula: wadh = Base64(SHA256('2.5' + ra + rc + lr + de + pfr))
 * Where: ra = deviceType ('F' for fingerprint), rc = 'Y', lr = 'Y', de = 'N', pfr = 'N'
 */
export const generateWadh = (deviceType = 'F') => {
  const ra = deviceType; // Device type: 'F' for fingerprint devices
  const rc = 'Y';
  const lr = 'Y'; // CRITICAL: Must be 'Y' for ABHA compliance
  const de = 'N';
  const pfr = 'N';

  const text = '2.5' + ra + rc + lr + de + pfr;
  
  const wadh = CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(text));
  
  if (!wadh || wadh === "") {
    throw new Error("WADH generation returned empty string");
  }
  
  return wadh;
};

/**
 * Discover Mantra RD Service by scanning ports
 * @param {Function} onStatusUpdate - Callback for status updates
 * @returns {Promise<{url: string, capturePath: string, deviceType: string}>}
 */
export const discoverDevice = async (onStatusUpdate = () => {}) => {
  return new Promise((resolve, reject) => {
    const primaryUrl = window.location.href.indexOf("https") >= 0 
      ? "https://127.0.0.1:" 
      : "http://127.0.0.1:";
    
    let discovered = false;
    let portIndex = PORT_RANGE_START;
    
    const discoveryTimeout = setTimeout(() => {
      if (!discovered) {
        reject(new Error("Unable to connect to the biometric device. Please check the device connection and try again."));
      }
    }, DISCOVERY_TIMEOUT);

    const tryNextPort = () => {
      if (discovered) {
        clearTimeout(discoveryTimeout);
        return;
      }
      
      if (portIndex > PORT_RANGE_END) {
        clearTimeout(discoveryTimeout);
        if (!discovered) {
          reject(new Error("Unable to connect to the biometric device. Please check the device connection and try again."));
        }
        return;
      }

      const url = primaryUrl + portIndex.toString();
      
      if (window.$) {
        window.$.ajax({
          type: "RDSERVICE",
          async: true,
          crossDomain: true,
          url: url,
          contentType: "text/xml; charset=utf-8",
          processData: false,
          cache: false,
          timeout: 2000, // 2 seconds per port
          success: function (data) {
            try {
              const $doc = window.$.parseXML(data);
              const serviceInfo = window.$($doc).find('RDService').attr('info');
              
              if (serviceInfo && serviceInfo.indexOf('Mantra') >= 0) {
                discovered = true;
                clearTimeout(discoveryTimeout);
                const deviceInfo = serviceInfo.toUpperCase();
                let deviceType = 'F';
                if (deviceInfo.indexOf('MFS100') >= 0 || 
                    deviceInfo.indexOf('MFS110') >= 0 || 
                    deviceInfo.indexOf('EPI1000') >= 0 || 
                    deviceInfo.indexOf('IRITECH') >= 0 || 
                    deviceInfo.indexOf('MIS100V2') >= 0) {
                  deviceType = 'F';
                }
                
                let capturePath = '';
                window.$($doc).find('Interface').each(function() {
                  const path = window.$(this).attr('path');
                  if (path === "/rd/capture") {
                    capturePath = path;
                  }
                });
                
                onStatusUpdate("Device discovered successfully");
                resolve({
                  url: url,
                  capturePath: capturePath,
                  deviceType: deviceType
                });
              } else {
                // Try next port
                portIndex++;
                setTimeout(() => {
                  tryNextPort();
                }, 100);
              }
            } catch (error) {
              portIndex++;
              setTimeout(() => {
                tryNextPort();
              }, 100);
            }
          },
          error: function () {
            portIndex++;
            setTimeout(() => {
              tryNextPort();
            }, 100);
          }
        });
      } else {
        const fetchController = new AbortController();
        const fetchTimeout = setTimeout(() => fetchController.abort(), 2000);
        
        fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
          },
          signal: fetchController.signal,
        })
        .then(response => {
          clearTimeout(fetchTimeout);
          return response.text();
        })
        .then(data => {
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");
            const serviceInfo = xmlDoc.querySelector('RDService')?.getAttribute('info');
            
            if (serviceInfo && serviceInfo.indexOf('Mantra') >= 0) {
              discovered = true;
              clearTimeout(discoveryTimeout);
              
              // Detect device type from service info
              const deviceInfo = serviceInfo.toUpperCase();
              let deviceType = 'F';
              if (deviceInfo.indexOf('MFS100') >= 0 || 
                  deviceInfo.indexOf('MFS110') >= 0 || 
                  deviceInfo.indexOf('EPI1000') >= 0 || 
                  deviceInfo.indexOf('IRITECH') >= 0 || 
                  deviceInfo.indexOf('MIS100V2') >= 0) {
                deviceType = 'F';
              }
              
              let capturePath = '';
              const interfaces = xmlDoc.querySelectorAll('Interface');
              interfaces.forEach(iface => {
                const path = iface.getAttribute('path');
                if (path === "/rd/capture") {
                  capturePath = path;
                }
              });
              
              onStatusUpdate("Device discovered successfully");
              resolve({
                url: url,
                capturePath: capturePath,
                deviceType: deviceType
              });
            } else {
              portIndex++;
              setTimeout(() => {
                tryNextPort();
              }, 100);
            }
          } catch (error) {
            portIndex++;
            setTimeout(() => {
              tryNextPort();
            }, 100);
          }
        })
        .catch(() => {
          clearTimeout(fetchTimeout);
          portIndex++;
          setTimeout(() => {
            tryNextPort();
          }, 100);
        });
      }
    };

    tryNextPort();
  });
};

/**
 * Capture fingerprint from discovered device
 * @param {string} deviceUrl - Base URL of discovered device
 * @param {string} capturePath - Capture endpoint path
 * @param {string} deviceType - Device type ('F' for fingerprint)
 * @param {Function} onStatusUpdate - Callback for status updates
 * @returns {Promise<{pid: string, fullXmlResponse: string, fullXmlBase64: string, wadh: string, format: string, timestamp: string}>}
 */
export const captureFingerprint = async (deviceUrl, capturePath, deviceType, onStatusUpdate = () => {}) => {
  return new Promise((resolve, reject) => {
    if (!deviceUrl || !capturePath) {
      reject(new Error("Device not discovered"));
      return;
    }

    onStatusUpdate("Capturing fingerprint... Please place your thumb on the scanner.");

    const captureTimeout = setTimeout(() => {
      reject(new Error("Biometric capture took too long and was not completed. Please try again."));
    }, CAPTURE_TIMEOUT);

    let wadh;
    try {
      wadh = generateWadh(deviceType);
    } catch (error) {
      clearTimeout(captureTimeout);
      reject(new Error("WADH generation failed: " + error.message));
      return;
    }

    const fCount = "1";
    const fType = "2"; // FMR+FIR (Required for ABHA compliance)
    const timeout = "30000"; // 30 seconds
    const pidVer = "2.0";
    const env = "P"; // Production

    // Build XML request with WADH attribute
    const xmlRequest = '<?xml version="1.0"?>' +
      '<PidOptions ver="1.0">' +
      '<Opts ' +
      'env="' + env + '" ' +
      'fCount="' + fCount + '" ' +
      'fType="' + fType + '" ' +
      'format="0" ' +
      'iCount="0" ' +
      'pCount="0" ' +
      'pidVer="' + pidVer + '" ' +
      'posh="UNKNOWN" ' +
      'timeout="' + timeout + '" ' +
      'wadh="' + wadh + '" ' +
      '/>' +
      '<CustOpts>' +
      '<Param name="mantrakey" value="" />' +
      '</CustOpts>' +
      '</PidOptions>';

    const captureUrl = deviceUrl + capturePath;

    if (window.$) {
      window.$.ajax({
        type: "CAPTURE",
        async: true,
        crossDomain: true,
        url: captureUrl,
        data: xmlRequest,
        contentType: "text/xml; charset=utf-8",
        processData: false,
        timeout: CAPTURE_TIMEOUT,
        success: function (data) {
          clearTimeout(captureTimeout);
          try {
            const fingerprintData = parseCaptureResponse(data, wadh);
            resolve(fingerprintData);
          } catch (error) {
            const errorMessage = error.message || "Capture failed";
            reject(new Error(errorMessage));
          }
        },
        error: function (jqXHR, ajaxOptions, thrownError) {
          clearTimeout(captureTimeout);
          const errorMsg = parseCaptureError(jqXHR, thrownError);
          reject(new Error(errorMsg));
        }
      });
    } else {
      const fetchController = new AbortController();
      const fetchTimeout = setTimeout(() => fetchController.abort(), CAPTURE_TIMEOUT);
      
      fetch(captureUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
        },
        body: xmlRequest,
        signal: fetchController.signal,
      })
      .then(response => {
        clearTimeout(fetchTimeout);
        return response.text();
      })
      .then(data => {
        clearTimeout(captureTimeout);
        try {
          const fingerprintData = parseCaptureResponse(data, wadh);
          resolve(fingerprintData);
        } catch (error) {
          const errorMessage = error.message || "Capture failed";
          reject(new Error(errorMessage));
        }
      })
      .catch(error => {
        clearTimeout(fetchTimeout);
        clearTimeout(captureTimeout);
        reject(new Error(error.message || "Capture failed"));
      });
    }
  });
};

/**
 * Parse capture response XML
 */
const parseCaptureResponse = (xmlResponse, wadh) => {
  let pidData = '';
  let format = 'X';
  let responseWadh = wadh;

  if (window.$) {
    const $doc = window.$.parseXML(xmlResponse);
    const errCode = window.$($doc).find('Resp').attr('errCode');
    const errInfo = window.$($doc).find('Resp').attr('errInfo');
    
    if (errCode !== "0") {
      let userFriendlyMessage = errInfo || "Capture failed";
      
      if (errInfo && errInfo.toLowerCase().includes("finger")) {
        userFriendlyMessage = "Incorrect finger placement. Please place your thumb correctly on the scanner and try again.";
      } else if (errInfo && errInfo.toLowerCase().includes("quality")) {
        userFriendlyMessage = "Fingerprint quality is poor. Please clean your thumb and try again.";
      } else if (errInfo && (errInfo.toLowerCase().includes("timeout") || errInfo.toLowerCase().includes("timed out"))) {
        userFriendlyMessage = "Biometric capture took too long and was not completed. Please try again.";
      } else if (errInfo && errInfo.toLowerCase().includes("device")) {
        userFriendlyMessage = "Device error. Please check the scanner connection and try again.";
      }
      
      throw new Error(userFriendlyMessage);
    }

    pidData = window.$($doc).find('Data[type="X"]').text() || window.$($doc).find('Data').text() || '';
    responseWadh = window.$($doc).find('Data').attr('wadh') || wadh;
    format = window.$($doc).find('Data').attr('type') || 'X';
    
    // Also try to extract from <Pid> tag if available
    if (!pidData) {
      pidData = window.$($doc).find('Pid').text() || '';
    }
  } else {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlResponse, "text/xml");
    const resp = xmlDoc.querySelector('Resp');
    const errCode = resp?.getAttribute('errCode');
    const errInfo = resp?.getAttribute('errInfo');
    
    if (errCode !== "0") {
      let userFriendlyMessage = errInfo || "Capture failed";
      
      if (errInfo && errInfo.toLowerCase().includes("finger")) {
        userFriendlyMessage = "Incorrect finger placement. Please place your thumb correctly on the scanner and try again.";
      } else if (errInfo && errInfo.toLowerCase().includes("quality")) {
        userFriendlyMessage = "Fingerprint quality is poor. Please clean your thumb and try again.";
      } else if (errInfo && (errInfo.toLowerCase().includes("timeout") || errInfo.toLowerCase().includes("timed out"))) {
        userFriendlyMessage = "Biometric capture took too long and was not completed. Please try again.";
      } else if (errInfo && errInfo.toLowerCase().includes("device")) {
        userFriendlyMessage = "Device error. Please check the scanner connection and try again.";
      }
      
      throw new Error(userFriendlyMessage);
    }

    const dataElement = xmlDoc.querySelector('Data[type="X"]') || xmlDoc.querySelector('Data');
    pidData = dataElement?.textContent || '';
    responseWadh = dataElement?.getAttribute('wadh') || wadh;
    format = dataElement?.getAttribute('type') || 'X';
    
    if (!pidData) {
      const pidElement = xmlDoc.querySelector('Pid');
      pidData = pidElement?.textContent || '';
    }
  }
  
  const fullXmlBase64 = btoa(unescape(encodeURIComponent(xmlResponse)));
  
  return {
    pid: pidData,
    fullXmlResponse: xmlResponse,
    fullXmlBase64: fullXmlBase64,
    wadh: responseWadh,
    format: format,
    timestamp: new Date().toISOString()
  };
};
const parseCaptureError = (jqXHR, thrownError) => {
  if (jqXHR) {
    if (jqXHR.statusText === 'timeout' || (thrownError && (thrownError.toLowerCase().includes('timeout') || thrownError.toLowerCase().includes('timed out')))) {
      return 'Biometric capture took too long and was not completed. Please try again.';
    }
    if (jqXHR.status === 0) {
      return 'Service Unavailable - Please ensure RD Service is running';
    } else if (jqXHR.status === 404) {
      return 'RD Service endpoint not found';
    } else if (jqXHR.status === 500) {
      return 'Internal Server Error - RD Service error';
    } else {
      if (thrownError && (thrownError.toLowerCase().includes('timeout') || thrownError.toLowerCase().includes('timed out'))) {
        return 'Biometric capture took too long and was not completed. Please try again.';
      }
      return 'Error: ' + (thrownError || 'Unknown error');
    }
  }
  if (thrownError && (thrownError.toLowerCase().includes('timeout') || thrownError.toLowerCase().includes('timed out'))) {
    return 'Biometric capture took too long and was not completed. Please try again.';
  }
  return thrownError || 'Unknown error';
};

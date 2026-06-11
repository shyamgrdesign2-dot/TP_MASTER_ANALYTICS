import { useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { checkTncRecord, createTncRecord } from "../api/services/ApiTnc";
import { TNC_VERSION } from "../utils/constants";


export const useTncConsent = ({
  authToken,
  getToken,
  setToken,
  isLoginPage,
  isReceptionist,
  pathname,
}) => {
  const tncProcessingRef = useRef(false);

  useEffect(() => {
    const checkAndCreateTncRecord = async () => {
      if (isLoginPage || isReceptionist) {
        return;
      }

      const currentToken = authToken || getToken();
      if (!currentToken) {
        return;
      }

      try {
        const decoded = jwtDecode(currentToken);
        const userId = decoded?.result?.user_id;

        if (!userId) {
          return;
        }

        const tncCheckKey = `tnc_check_done_${userId}`;
        const hasCheckedTnc = localStorage.getItem(tncCheckKey);

        if (hasCheckedTnc || tncProcessingRef.current) {
          return;
        }

        const tokenToBackup = currentToken;
        if (tokenToBackup && typeof tokenToBackup === "string") {
          sessionStorage.setItem(
            "tnc_backup_token",
            JSON.stringify(tokenToBackup)
          );
        }

        tncProcessingRef.current = true;

        let checkResponse;
        try {
          checkResponse = await checkTncRecord();
        } catch (checkError) {
          const statusCode = checkError?.response?.status;
          if (
            (statusCode === 401 ||
              statusCode === 400 ||
              statusCode === 403) &&
            !getToken()
          ) {
            if (authToken) {
              setToken(authToken);
            } else {
              const backupToken = sessionStorage.getItem("tnc_backup_token");
              if (backupToken) {
                try {
                  setToken(JSON.parse(backupToken));
                } catch (e) {
                  console.warn("Could not restore token from backup");
                }
              }
            }
          }
          checkResponse = { exists: false };
        }

        const doesNotExist =
          checkResponse?.exists === false ||
          checkResponse?.exists === "false";

        if (doesNotExist) {
          try {
            const response = await createTncRecord({
              um_id: userId,
              tnc_version: Number(TNC_VERSION),
            });

            localStorage.setItem(tncCheckKey, "true");
            tncProcessingRef.current = false;
          } catch (createError) {
            const statusCode = createError?.response?.status;
            const errorMessage =
              createError?.response?.data?.message ||
              createError?.response?.data?.error ||
              createError?.message ||
              "";

            if (
              (statusCode === 401 ||
                statusCode === 400 ||
                statusCode === 403) &&
              !getToken()
            ) {
              if (authToken) {
                setToken(authToken);
              } else {
                const backupToken = sessionStorage.getItem("tnc_backup_token");
                if (backupToken) {
                  try {
                    setToken(JSON.parse(backupToken));
                  } catch (e) {
                    console.warn("Could not restore token from backup");
                  }
                }
              }
            }

            const isAlreadyExists =
              statusCode === 409 ||
              errorMessage.toLowerCase().includes("already exists") ||
              errorMessage
                .toLowerCase()
                .includes("tnc change record already exists") ||
              errorMessage
                .toLowerCase()
                .includes("user consent record already exists");

            if (isAlreadyExists) {
              localStorage.setItem(tncCheckKey, "true");
            } else {
              console.error("Error creating TNC record:", {
                status: statusCode,
                message: errorMessage,
              });
              localStorage.setItem(tncCheckKey, "true");
            }
            tncProcessingRef.current = false;
          }
        } else {
          localStorage.setItem(tncCheckKey, "true");
          tncProcessingRef.current = false;
        }
      } catch (error) {
        const statusCode = error?.response?.status;
        const errorMessage = error?.response?.data?.message || error?.message || "";

        console.error("Error checking TNC record:", {
          status: statusCode,
          message: errorMessage,
        });

        if (
          statusCode === 401 ||
          statusCode === 404 ||
          statusCode === 400 ||
          statusCode === 403
        ) {
          const currentToken = authToken || getToken();
          if (!currentToken && authToken) {
            setToken(authToken);
          } else if (!currentToken) {
            const storedToken = sessionStorage.getItem("tnc_backup_token");
            if (storedToken) {
              try {
                setToken(JSON.parse(storedToken));
              } catch (e) {
                console.warn("Could not restore token from backup");
              }
            }
          }
        }

        try {
          const currentToken = authToken || getToken();
          if (currentToken) {
            const decoded = jwtDecode(currentToken);
            const userId = decoded?.result?.user_id;

            if (
              userId &&
              (statusCode === 401 ||
                statusCode === 404 ||
                statusCode === 400)
            ) {
              const tncCheckKey = `tnc_check_done_${userId}`;
              try {
                const response = await createTncRecord({
                  um_id: userId,
                  tnc_version: Number(TNC_VERSION),
                });
                localStorage.setItem(tncCheckKey, "true");
              } catch (createError) {
                console.error(
                  "Error creating TNC record after check error:",
                  createError
                );
                localStorage.setItem(tncCheckKey, "true");
              }
            }
          }
        } catch (tokenError) {
          console.error(
            "Error extracting userId from token in catch block:",
            tokenError
          );
        }

        tncProcessingRef.current = false;
      }
    };

    checkAndCreateTncRecord();
  }, [authToken, isLoginPage, isReceptionist, pathname, getToken, setToken]);
};


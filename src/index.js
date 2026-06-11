import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import App from './App';
import reportWebVitals from './reportWebVitals';

import './index.css';
import './styles/app.scss';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as Sentry from "@sentry/react";
import {
  isChunkLoadError,
  shouldReloadForChunkFailure,
} from "./utils/chunkReloadGuard";
import { isProductionEnv } from "./utils/environment";

// Provide a MoEngage stub with a bounded queue so early calls don't crash or get lost.
if (typeof window !== "undefined") {
  window.Moengage = window.Moengage || {};
  window.__moeQueue = window.__moeQueue || [];
  window.__flushMoeQueue = window.__flushMoeQueue || ((moeInstance) => {
    if (!moeInstance || !window.__moeQueue) return;
    const queue = window.__moeQueue;
    window.__moeQueue = [];
    queue.forEach(({ fn, args }) => {
      try {
        if (typeof moeInstance?.[fn] === "function") {
          moeInstance[fn](...args);
        }
      } catch (_) {
        // no-op: avoid breaking app on analytics errors
      }
    });
  });
  [
    "track_event",
    "add_user_attribute",
    "add_unique_user_id",
    "add_first_name",
    "add_last_name",
    "add_email",
    "add_mobile",
    "destroy_session",
  ].forEach((fn) => {
    if (!window.Moengage[fn]) {
      window.Moengage[fn] = (...args) => {
        const q = window.__moeQueue;
        if (!q) return;
        if (q.length >= 50) q.shift();
        q.push({ fn, args });
      };
    }
  });
}

const appEnv = process.env.REACT_APP_ENV || "prod";
const isProd = isProductionEnv(appEnv);
const tracesSampleRateValue =
  Number(
    process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE ??
      (isProd ? 0.1 : 0.5)
  ) || 0.5;

// DEMO build: never report to the company Sentry project from the standalone
// demo — pass no DSN so the SDK stays inert (withSentryReactRouterV6Routing
// still works as a no-op wrapper).
const SENTRY_DEMO_DISABLED = true;

Sentry.init({
  dsn: SENTRY_DEMO_DISABLED
    ? undefined
    : "https://a4c36bf5194238bfa49de0a593619865@o4509755819294720.ingest.us.sentry.io/4510737179475968",
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  tracesSampleRate: tracesSampleRateValue,
  tracePropagationTargets: [],
  sendDefaultPii: true,
  environment: appEnv,
  beforeSend(event) {
    // Filter out development errors or specific error types
    if (event.environment === "dev") return null;
    return event;
  },
  enableLogs: true
});

// Fix for stale lazy-loaded chunks after a new deployment.
// Bounded retries prevent infinite reload loops while allowing transient recovery.

if (typeof window !== "undefined") {
  const reloadIfAllowed = (signature) => {
    if (!shouldReloadForChunkFailure(signature)) return;
    window.location.reload();
  };

  window.addEventListener("error", (event) => {
    const message = event?.message || event?.error?.message || "";

    if (isChunkLoadError(message)) {
      reloadIfAllowed(`global-error:${message}`);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const message = event?.reason?.message || "";

    if (isChunkLoadError(message)) {
      reloadIfAllowed(`unhandled-rejection:${message}`);
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <BrowserRouter basename={"/"}>
      <App />
    </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register Service Worker for PWA
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Only register on HTTPS or localhost (PWA requirement)
  const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isSecureContext) {
    window.addEventListener('load', () => {
      // Check if service worker is already registered
      navigator.serviceWorker.getRegistration()
        .then((existingRegistration) => {
          if (existingRegistration) {
            // Service worker already registered, just log
            if (process.env.NODE_ENV !== 'production') {
              console.log('Service Worker already registered:', existingRegistration.scope);
            }
            return existingRegistration;
          }
          // Register new service worker
          return navigator.serviceWorker.register('/serviceworker.js', {
            scope: '/'
          });
        })
        .then((registration) => {
          if (registration) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('Service Worker registered successfully:', registration.scope);
            }
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    if (process.env.NODE_ENV !== 'production') {
                      console.log('Service Worker updated');
                    }
                    // Optionally show update notification to user
                  }
                });
              }
            });
          }
        })
        .catch((error) => {
          // Silently fail - service worker is optional for PWA functionality
          // Only log in development
          if (process.env.NODE_ENV !== 'production') {
            console.error('Service Worker registration failed:', error);
          }
        });
    });

    // Listen for service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Service Worker controller changed');
      }
      // Optionally reload page when new service worker takes control
      // window.location.reload();
    });
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('Service Worker requires HTTPS (or localhost)');
  }
}

# ---- BUILD STAGE ----
# CRA often prints nothing for a long time during "Creating an optimized production build..." — that is normal.
# Faster builds: pass GENERATE_SOURCEMAP=false from CI (see workflows). Smaller image: .map files removed after Sentry upload in npm run build.
FROM node:20 AS build

ARG REACT_APP_ENV
ARG SENTRY_AUTH_TOKEN
ARG GENERATE_SOURCEMAP

ENV REACT_APP_ENV=$REACT_APP_ENV
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV GENERATE_SOURCEMAP=$GENERATE_SOURCEMAP

ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

RUN find /app/build -name "*.map" -type f -delete

# ---- PRODUCTION STAGE ----
FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
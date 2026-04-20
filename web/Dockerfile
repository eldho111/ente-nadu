FROM node:20-alpine

WORKDIR /app
ARG NEXT_DIST_DIR=.next-prod
ENV NEXT_DIST_DIR=${NEXT_DIST_DIR}

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN rm -rf .next .next-dev .next-prod
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]

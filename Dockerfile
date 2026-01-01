FROM mirror.gcr.io/library/node:20-alpine as build
WORKDIR /site
COPY package.json ./
RUN npm install --no-fund
COPY . .
RUN npm run build

FROM mirror.gcr.io/library/nginx:1.25-alpine
COPY --from=build /site/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

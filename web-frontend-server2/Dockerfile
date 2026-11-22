FROM nginx:stable-alpine
COPY index.html /usr/share/nginx/html/index.html
COPY students.html /usr/share/nginx/html/students.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

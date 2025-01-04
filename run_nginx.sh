# Stop and remove the container if it exists
docker stop nginx 1>/dev/null 2>/dev/null 
docker rm nginx 1>/dev/null 2>/dev/null

# Run the container
# mount: ./nginx/static/index.html will be /usr/share/nginx/html/index.html
docker run --name nginx \
       --detach --publish 80:80 \
       --mount type=bind,src=./nginx/nginx.conf,dst=/etc/nginx/nginx.conf,ro \
       --mount type=bind,src=./display,dst=/usr/share/nginx/html,ro \
       --mount type=bind,src=./services,dst=/data/services,ro \
       nginx:1.27.3

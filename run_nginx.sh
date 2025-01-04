# Stop and remove the container if it exists
docker stop nginx 1>/dev/null 2>/dev/null 
docker rm nginx 1>/dev/null 2>/dev/null

# Run the container
# - File "./display/index.html" will be mounted as "/usr/share/nginx/html/index.html"
# - Mounting "./nginx/conf.d" directory erases "/etc/nginx/conf.d/default.conf"
docker run --name nginx \
       --detach --publish 80:80 \
       --mount type=bind,src=./nginx/nginx.conf,dst=/etc/nginx/nginx.conf,ro \
       --mount type=bind,src=./nginx/conf.d,dst=/etc/nginx/conf.d,ro \
       \
       --mount type=bind,src=./display,dst=/usr/share/nginx/html,ro \
       --mount type=bind,src=./services,dst=/data/services,ro \
       nginx:1.27.3

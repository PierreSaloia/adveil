// Local, non-recording CONNECT tunnel. TLS stays end-to-end; Node uses the OS resolver.
// This avoids the isolated Comet profile's DNS failures without altering browser/system settings.
import {createServer,request} from 'node:http';
import {connect} from 'node:net';
export async function startProxy(){
 const sockets=new Set();
 const track=socket=>{sockets.add(socket);socket.on('error',()=>{});socket.once('close',()=>sockets.delete(socket));return socket;};
 const server=createServer((req,res)=>{
  let url;try{url=new URL(req.url);}catch{res.writeHead(400).end();return;}
  if(url.protocol!=='http:'){res.writeHead(400).end();return;}
  const headers={...req.headers};delete headers['proxy-connection'];delete headers['proxy-authorization'];
  const upstream=request(url,{method:req.method,headers},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.pipe(upstream);
 });
 server.on('connection',track);
 server.on('connect',(req,client,head)=>{
  let target;try{target=new URL('http://'+req.url);}catch{client.end('HTTP/1.1 400 Bad Request\r\n\r\n');return;}
  const socket=track(connect({host:target.hostname,port:Number(target.port||443)}));
  socket.setTimeout(25000,()=>socket.destroy());
  socket.once('connect',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)socket.write(head);socket.pipe(client);client.pipe(socket);});
  socket.once('error',()=>client.destroy());client.once('close',()=>socket.destroy());
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:'http://127.0.0.1:'+server.address().port,close:async()=>{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}};
}

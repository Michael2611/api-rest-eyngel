var express = require('express');
var postController = require('../controllers/post');
var auth = require('../middlewares/auth');
var multiparty = require('connect-multiparty');
var path = multiparty({uploadDir: './uploads/posts', autoFiles: true,});

var app = express.Router();

app.post('/create_post',[auth.auth,path],postController.create_post);
app.get('/get_post_amigos/:limit/:filtro',auth.auth,postController.get_post_amigos);
app.get('/obtener_post_img/:img', postController.obtener_post_img);
app.post('/set_like_post',auth.auth,postController.set_like_post);
app.post('/set_comentario_post',auth.auth,postController.set_comentario_post);

app.get('/get_post/:id',auth.auth, postController.get_post);
app.get('/get_post_usuario/:username/:limit',auth.auth, postController.get_post_usuario);
app.delete('/delete_post/:id',auth.auth, postController.delete_post);
app.delete('/delete_comentario/:id',auth.auth, postController.delete_comentario);
app.get('/get_imagenes/:username',auth.auth, postController.get_imagenes);
app.get('/get_video/:username',auth.auth, postController.get_video);
app.get('/get_notificaciones',auth.auth, postController.get_notificaciones);
app.get('/set_estado_notificacion/:id',auth.auth, postController.set_estado_notificacion);

module.exports = app;
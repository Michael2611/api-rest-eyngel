var express = require('express');
var canalController = require('../controllers/canal');
var auth = require('../middlewares/auth');
var multiparty = require('connect-multiparty');
var path = multiparty({uploadDir:'./uploads/canales/avatar'});
var pathChat = multiparty({uploadDir:'./uploads/canales/chat'});

var app = express.Router();

app.post('/create_canal',[auth.auth, path],canalController.create_canal);
app.get('/get_canales', auth.auth ,canalController.get_canales);
app.get('/obtener_avatar_canal/:img', canalController.obtener_avatar_canal);
app.get('/get_canal/:id', auth.auth ,canalController.get_canal);

app.get('/seguir_canal/:tipo/:id', auth.auth, canalController.seguir_canal);
app.delete('/delete_canal/:id', auth.auth, canalController.delete_canal);

app.post('/create_chat_canal',[auth.auth, pathChat],canalController.create_chat_canal);
app.get('/get_chat_canal/:id', auth.auth ,canalController.get_chat_canal);
app.get('/obtener_chat_img/:img', canalController.obtener_chat_img);
app.delete('/vaciar_canal/:id', auth.auth, canalController.vaciar_canal);
app.delete('/delete_message/:id', auth.auth, canalController.delete_message);
app.put('/update_canal/:id', auth.auth, canalController.update_canal);

module.exports = app;
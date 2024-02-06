var express = require('express');
var paginaController = require('../controllers/pagina');
var auth = require('../middlewares/auth');
var multiparty = require('connect-multiparty');
var path = multiparty({uploadDir:'./uploads/portadas'});
var pathAvatar = multiparty({uploadDir:'./uploads/avatar'});

var app = express.Router();

app.post('/create_pagina',auth.auth,paginaController.create_pagina);
app.get('/get_paginas_usuario',auth.auth,paginaController.get_paginas_usuario);
app.get('/pagina_usuario/:id', auth.auth, paginaController.pagina_usuario);

app.post('/actualizar_avatar_pagina/:id', [auth.auth,pathAvatar], paginaController.actualizar_avatar_pagina);
app.get('/obtener_avatar_img_pagina/:img', paginaController.obtener_avatar_img_pagina);
app.post('/actualizar_portada_pagina/:id', [auth.auth,path], paginaController.actualizar_portada_pagina);
app.get('/obtener_portada_img_pagina/:img', paginaController.obtener_portada_img_pagina);

app.get('/seguir_pagina/:tipo/:id', auth.auth, paginaController.seguir_pagina);
app.get('/get_post_pagina/:id',auth.auth, paginaController.get_post_pagina);
app.delete('/delete_pagina/:id',auth.auth, paginaController.delete_pagina);



module.exports = app;
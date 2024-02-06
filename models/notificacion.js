var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NotificacionSchema = Schema({
    tipo: {type: String, required: true}, //publicaciones - solicitudes de amistad
    descripcion : {type: String, required: true},
    estado: {type: Boolean, default: false, required: true},
    usuario: {type: Schema.ObjectId, ref: 'usuario', required: false}, 
    usuario_interaccion: {type: Schema.ObjectId, ref: 'usuario', required: false},
    post: {type: Schema.ObjectId, ref: 'post', required: false},
    usuario_amigo: {type: Schema.ObjectId, ref: 'usuario_amigo', required: false},
    createdAt: {type: Date, default:Date.now}
});

module.exports = mongoose.model('notificacion', NotificacionSchema);
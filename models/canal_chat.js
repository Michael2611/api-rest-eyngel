var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CanalChatSchema = Schema({
    contenido: {type: String, required: false},
    media: {type: String, required: false},
    tipo: {type: String, required: true}, //hilo,media.
    canal: {type: Schema.ObjectId, ref: 'canal'},
    usuario: {type: Schema.ObjectId, ref: 'usuario'},
    createdAt: {type: Date, default:Date.now}
});

module.exports = mongoose.model('canal_chat', CanalChatSchema);
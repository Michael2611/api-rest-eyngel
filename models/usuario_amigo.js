var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Usuario_amigoSchema = Schema({
    usuario_origen: {type: Schema.ObjectId, ref: 'usuario', required: true},
    usuario_amigo: {type: Schema.ObjectId, ref: 'usuario', required: true},
    tipo: {type: String, required: true},
    createdAt: {type: Date, default:Date.now}
});

module.exports = mongoose.model('usuario_amigo', Usuario_amigoSchema);
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Usuario_invitacionchema = Schema({
    usuario_origen: {type: Schema.ObjectId, ref: 'usuario', required: true},
    usuario_destinatario: {type: Schema.ObjectId, ref: 'usuario', required: true},

    createdAt: {type: Date, default:Date.now}
});

module.exports = mongoose.model('usuario_invitacion', Usuario_invitacionchema);
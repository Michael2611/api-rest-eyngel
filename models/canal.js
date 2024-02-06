var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CanalSchema = Schema({
    nombre_canal: {type: String, required:true},
    descripcion_canal: {type: String, required:false},
    usuario_canal: {type: Schema.ObjectId, ref: 'usuario', required: false}, 

    verified_canal: {type: Boolean, default:false, required:true},
    avatar_canal: {type: String, default: 'defecto.png', required: false},
    createdAt: {type: Date, default:Date.now}
});

module.exports = mongoose.model('canal', CanalSchema);
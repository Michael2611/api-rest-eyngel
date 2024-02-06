var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PaginaSchema = Schema({
    nombre_pag: {type: String, required:true},
    categoria_pag: {type: String, required:true},
    descripcion_pag: {type: String, required:false},
    telefono_pag: {type: String, required:false},
    correo_pag: {type: String, required:false},
    lugar_pag: {type: String, required:false},
    usuario_pag: {type: Schema.ObjectId, ref: 'usuario', required: false}, 

    avatar_pag: {type: String, default: 'defecto.png', required: false},
    portada_pag: {type: String, default: 'defecto.png', required: false},

    createdAt: {type: Date, default:Date.now}
});

module.exports = mongoose.model('pagina', PaginaSchema);
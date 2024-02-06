var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UsuarioSchema = Schema({
    nombres: {type: String, required: false},
    apellidos: {type: String, required: false},
    email: {type: String, required: true},
    pais: {type: String, required: false},
    profesion: {type: String, required: false},
    nacimiento: {type: String, required: false},
    genero: {type:String, required: false},
    telefono: {type: String, required: false},
    avatar: {type: String, default: 'defecto.png', required: false},
    portada: {type: String, required: false},

    estado: {type: Boolean, default:true, required: true},
    esAmigo: {type: Boolean, required: false},
    descripcion: {type: String, required: false},
    username: {type: String, required: false},
    password: {type: String, required: true},
    code_reset: {type:String, required: false},

    puntos_eyngel: {type: String, required:false},
    verificado: {type: Boolean, required:false},

    createdAt: {type: Date, default:Date.now}
});

module.exports = mongoose.model('usuario', UsuarioSchema);
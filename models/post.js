var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PostSchema = Schema({
    //titulo: {type: String, required: true},
    extracto: {type: String, required: false},
    contenido: {type: String, required: false},
    media: {type: String, required: false},
    tipo: {type: String, required: true}, //hilo,media.
    tipo_p: {type: String, required: true}, //hilo,media.
    privacidad: {type: String, required: true},
    usuario: {type: Schema.ObjectId, ref: 'usuario'},
    pagina: {type: Schema.ObjectId, ref: 'pagina'},
    createdAt: {type: Date, default:Date.now}
});

PostSchema.pre('save', function(next){
    if(this.tipo_p === 'Usuario'){
        if(!this.usuario){
            return next(new Error('Campo usuario es obligatorio'));
        }
    }else if(this.tipo_p === 'Pagina'){
        if(!this.pagina){
            return next(new Error('Campo pagina es obligatorio'));
        }
    }else{
        return next(new Error('Valor no valido'));
    }
    next();
});

module.exports = mongoose.model('post', PostSchema);
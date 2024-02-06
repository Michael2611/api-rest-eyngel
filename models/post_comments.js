var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PostCommentSchema = Schema({
    post: {type: Schema.ObjectId, ref: 'post', required: true},
    usuario: {type: Schema.ObjectId, ref: 'usuario', required: true},
    reply_id: {type: Schema.ObjectId, ref: 'post_comentarios', required: false}, 
    comentario: {type: String, required: true},
    tipo: {type: String, required: true},
    createdAt: {type: Date, default:Date.now}
});

module.exports = mongoose.model('post_comment', PostCommentSchema);
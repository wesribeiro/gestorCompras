/**
 * Middleware de Autenticação
 * * Verifica se o usuário está logado (se 'req.session.user' existe).
 * Se o usuário estiver logado, ele permite que a requisição continue (next()).
 * Se não estiver, ele bloqueia a requisição com um status 401 (Não Autorizado).
 */
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    // Usuário está logado, pode continuar
    next();
  } else {
    // Usuário não está logado
    res
      .status(401)
      .json({ message: "Acesso não autorizado. Por favor, faça login." });
  }
};

/**
 * Middleware de Autorização por Papel (Opcional, mas útil)
 * * Podemos criar funções que verificam papéis específicos.
 * Exemplo: garantir que apenas um 'admin' possa acessar uma rota.
 */
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Acesso negado. Requer permissão de administrador." });
  }
};

const isBuyerOrAdmin = (req, res, next) => {
  if (
    req.session.user &&
    (req.session.user.role === "buyer" || req.session.user.role === "admin")
  ) {
    next();
  } else {
    res
      .status(403)
      .json({
        message:
          "Acesso negado. Requer permissão de comprador ou administrador.",
      });
  }
};

// Exportamos as funções que queremos usar
module.exports = {
  isAuthenticated,
  isAdmin,
  isBuyerOrAdmin,
  // Adicionaremos mais funções (isDirector, etc) aqui conforme necessário
};

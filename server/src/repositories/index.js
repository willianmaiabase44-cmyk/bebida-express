// ============================================================
// Repositórios — camada de acesso a dados
// ============================================================
// Cada repositório encapsula queries SQL de uma entidade.
// Os services chamam os repositórios — controllers chamam os services.
// NUNCA colocar SQL diretamente nas rotas.
// ============================================================

export { userRepository } from './userRepository.js';
export { customerRepository } from './customerRepository.js';
export { customerAddressRepository } from './customerAddressRepository.js';
export { deliveryDriverRepository } from './deliveryDriverRepository.js';
export { productRepository } from './productRepository.js';
export { storeSettingsRepository } from './storeSettingsRepository.js';
export { couponRepository } from './couponRepository.js';
export { orderRepository } from './orderRepository.js';
export { stockMovementRepository } from './stockMovementRepository.js';
export { deliveryRepository } from './deliveryRepository.js';
export { deliveryReviewRepository } from './deliveryReviewRepository.js';
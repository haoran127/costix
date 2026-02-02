/**
 * i18n 翻译自动修复脚本
 * 用法: node scripts/fix-i18n.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, '../src/i18n/locales');
const baseLocale = 'en-US.json';

// 翻译映射表 - 将英文翻译成各种语言
const translations = {
  // Dashboard
  'dashboard.usageTrend': {
    'zh-CN': '用量趋势', 'zh-TW': '用量趨勢', 'ja': '使用量トレンド', 'ko': '사용량 트렌드',
    'de': 'Nutzungstrend', 'fr': 'Tendance d\'utilisation', 'es': 'Tendencia de uso',
    'pt': 'Tendência de uso', 'ru': 'Тренд использования', 'id': 'Tren Penggunaan'
  },
  'dashboard.day': {
    'zh-CN': '按天', 'zh-TW': '按天', 'ja': '日別', 'ko': '일별',
    'de': 'Tag', 'fr': 'Jour', 'es': 'Día', 'pt': 'Dia', 'ru': 'День', 'id': 'Hari'
  },
  'dashboard.week': {
    'zh-CN': '按周', 'zh-TW': '按週', 'ja': '週別', 'ko': '주별',
    'de': 'Woche', 'fr': 'Semaine', 'es': 'Semana', 'pt': 'Semana', 'ru': 'Неделя', 'id': 'Minggu'
  },
  'dashboard.month': {
    'zh-CN': '按月', 'zh-TW': '按月', 'ja': '月別', 'ko': '월별',
    'de': 'Monat', 'fr': 'Mois', 'es': 'Mes', 'pt': 'Mês', 'ru': 'Месяц', 'id': 'Bulan'
  },
  
  // API Keys
  'apiKeys.deleteWarning': {
    'zh-CN': '删除后将无法恢复，使用此 Key 的所有服务都将无法正常工作。',
    'zh-TW': '刪除後將無法恢復，使用此 Key 的所有服務都將無法正常工作。',
    'ja': '削除後は復元できません。このキーを使用するすべてのサービスが正常に動作しなくなります。',
    'ko': '삭제 후 복구할 수 없습니다. 이 키를 사용하는 모든 서비스가 정상적으로 작동하지 않게 됩니다.',
    'de': 'Nach dem Löschen kann es nicht wiederhergestellt werden. Alle Dienste, die diesen Schlüssel verwenden, funktionieren nicht mehr.',
    'fr': 'Une fois supprimé, il ne peut pas être récupéré. Tous les services utilisant cette clé ne fonctionneront plus.',
    'es': 'Una vez eliminado, no se puede recuperar. Todos los servicios que usen esta clave dejarán de funcionar.',
    'pt': 'Uma vez excluído, não pode ser recuperado. Todos os serviços que usam esta chave deixarão de funcionar.',
    'ru': 'После удаления восстановить невозможно. Все сервисы, использующие этот ключ, перестанут работать.',
    'id': 'Setelah dihapus tidak dapat dipulihkan. Semua layanan yang menggunakan kunci ini tidak akan berfungsi.'
  },
  
  // Alerts
  'alerts.keyExpiring.title': {
    'zh-CN': 'API Key 即将过期', 'zh-TW': 'API Key 即將過期', 'ja': 'APIキー有効期限間近',
    'ko': 'API 키 만료 임박', 'de': 'API-Schlüssel läuft bald ab', 'fr': 'Clé API bientôt expirée',
    'es': 'Clave API próxima a expirar', 'pt': 'Chave API prestes a expirar',
    'ru': 'API ключ скоро истечет', 'id': 'Kunci API akan segera kedaluwarsa'
  },
  'alerts.keyExpiring.message': {
    'zh-CN': 'API Key "{name}" 将在 {days} 天后过期（{date}）',
    'zh-TW': 'API Key "{name}" 將在 {days} 天後過期（{date}）',
    'ja': 'APIキー「{name}」は{days}日後に期限切れになります（{date}）',
    'ko': 'API 키 "{name}"이(가) {days}일 후 만료됩니다 ({date})',
    'de': 'API-Schlüssel "{name}" läuft in {days} Tagen ab ({date})',
    'fr': 'La clé API "{name}" expire dans {days} jours ({date})',
    'es': 'La clave API "{name}" expirará en {days} días ({date})',
    'pt': 'A chave API "{name}" expirará em {days} dias ({date})',
    'ru': 'API ключ "{name}" истечет через {days} дней ({date})',
    'id': 'Kunci API "{name}" akan kedaluwarsa dalam {days} hari ({date})'
  },
  'alerts.lowBalance.title': {
    'zh-CN': '账户余额不足', 'zh-TW': '帳戶餘額不足', 'ja': 'アカウント残高不足',
    'ko': '계정 잔액 부족', 'de': 'Niedriger Kontostand', 'fr': 'Solde du compte bas',
    'es': 'Saldo de cuenta bajo', 'pt': 'Saldo da conta baixo',
    'ru': 'Низкий баланс аккаунта', 'id': 'Saldo akun rendah'
  },
  'alerts.lowBalance.message': {
    'zh-CN': '平台账号 "{name}" ({platform}) 余额为 {balance}，低于阈值 {threshold}',
    'zh-TW': '平台帳號 "{name}" ({platform}) 餘額為 {balance}，低於閾值 {threshold}',
    'ja': 'プラットフォームアカウント「{name}」({platform})の残高は{balance}で、閾値{threshold}を下回っています',
    'ko': '플랫폼 계정 "{name}" ({platform})의 잔액이 {balance}으로 임계값 {threshold} 미만입니다',
    'de': 'Plattformkonto "{name}" ({platform}) hat einen Kontostand von {balance}, unter dem Schwellenwert {threshold}',
    'fr': 'Le compte plateforme "{name}" ({platform}) a un solde de {balance}, inférieur au seuil {threshold}',
    'es': 'La cuenta de plataforma "{name}" ({platform}) tiene un saldo de {balance}, por debajo del umbral {threshold}',
    'pt': 'A conta da plataforma "{name}" ({platform}) tem saldo de {balance}, abaixo do limite {threshold}',
    'ru': 'Баланс аккаунта платформы "{name}" ({platform}) составляет {balance}, ниже порога {threshold}',
    'id': 'Akun platform "{name}" ({platform}) memiliki saldo {balance}, di bawah ambang batas {threshold}'
  },
  'alerts.keyError.title': {
    'zh-CN': 'API Key 状态异常', 'zh-TW': 'API Key 狀態異常', 'ja': 'APIキーエラー',
    'ko': 'API 키 오류', 'de': 'API-Schlüssel-Fehler', 'fr': 'Erreur de clé API',
    'es': 'Error de clave API', 'pt': 'Erro de chave API',
    'ru': 'Ошибка API ключа', 'id': 'Error kunci API'
  },
  'alerts.keyError.message': {
    'zh-CN': 'API Key "{name}" 状态为：{status}', 'zh-TW': 'API Key "{name}" 狀態為：{status}',
    'ja': 'APIキー「{name}」のステータス: {status}', 'ko': 'API 키 "{name}" 상태: {status}',
    'de': 'API-Schlüssel "{name}" Status: {status}', 'fr': 'Statut de la clé API "{name}": {status}',
    'es': 'Estado de la clave API "{name}": {status}', 'pt': 'Status da chave API "{name}": {status}',
    'ru': 'Статус API ключа "{name}": {status}', 'id': 'Status kunci API "{name}": {status}'
  },
  'alerts.highUsage.title': {
    'zh-CN': '用量超标', 'zh-TW': '用量超標', 'ja': '高使用量',
    'ko': '높은 사용량', 'de': 'Hohe Nutzung', 'fr': 'Utilisation élevée',
    'es': 'Uso alto', 'pt': 'Uso alto', 'ru': 'Высокое использование', 'id': 'Penggunaan tinggi'
  },
  'alerts.highUsage.message': {
    'zh-CN': 'API Key "{name}" 本月用量 {usage} 超过阈值 {threshold}',
    'zh-TW': 'API Key "{name}" 本月用量 {usage} 超過閾值 {threshold}',
    'ja': 'APIキー「{name}」の今月の使用量{usage}が閾値{threshold}を超えました',
    'ko': 'API 키 "{name}"의 이번 달 사용량 {usage}이(가) 임계값 {threshold}을(를) 초과했습니다',
    'de': 'API-Schlüssel "{name}" monatliche Nutzung {usage} überschreitet Schwellenwert {threshold}',
    'fr': 'L\'utilisation mensuelle de la clé API "{name}" {usage} dépasse le seuil {threshold}',
    'es': 'El uso mensual de la clave API "{name}" {usage} supera el umbral {threshold}',
    'pt': 'O uso mensal da chave API "{name}" {usage} excede o limite {threshold}',
    'ru': 'Месячное использование API ключа "{name}" {usage} превышает порог {threshold}',
    'id': 'Penggunaan bulanan kunci API "{name}" {usage} melebihi ambang batas {threshold}'
  },
  'alerts.markAsResolved': {
    'zh-CN': '标记为已解决', 'zh-TW': '標記為已解決', 'ja': '解決済みにする',
    'ko': '해결됨으로 표시', 'de': 'Als gelöst markieren', 'fr': 'Marquer comme résolu',
    'es': 'Marcar como resuelto', 'pt': 'Marcar como resolvido',
    'ru': 'Отметить как решенное', 'id': 'Tandai sebagai terselesaikan'
  },
  'alerts.unreadCount': {
    'zh-CN': '未读告警', 'zh-TW': '未讀告警', 'ja': '未読アラート',
    'ko': '읽지 않은 알림', 'de': 'Ungelesene Alarme', 'fr': 'Alertes non lues',
    'es': 'Alertas no leídas', 'pt': 'Alertas não lidos',
    'ru': 'Непрочитанные оповещения', 'id': 'Peringatan belum dibaca'
  },
  'alerts.severities.info': {
    'zh-CN': '信息', 'zh-TW': '資訊', 'ja': '情報', 'ko': '정보',
    'de': 'Info', 'fr': 'Info', 'es': 'Info', 'pt': 'Info', 'ru': 'Информация', 'id': 'Info'
  },
  'alerts.severities.warning': {
    'zh-CN': '警告', 'zh-TW': '警告', 'ja': '警告', 'ko': '경고',
    'de': 'Warnung', 'fr': 'Avertissement', 'es': 'Advertencia', 'pt': 'Aviso', 'ru': 'Предупреждение', 'id': 'Peringatan'
  },
  'alerts.severities.error': {
    'zh-CN': '错误', 'zh-TW': '錯誤', 'ja': 'エラー', 'ko': '오류',
    'de': 'Fehler', 'fr': 'Erreur', 'es': 'Error', 'pt': 'Erro', 'ru': 'Ошибка', 'id': 'Error'
  }
};

// 完整的 team 模块翻译
const teamTranslations = {
  'es': {
    statusDisabled: 'Deshabilitado', tableHeaderMember: 'Miembro', tableHeaderRole: 'Rol',
    tableHeaderStatus: 'Estado', tableHeaderActions: 'Acciones', inviteModalTitle: 'Invitar miembro',
    inviteEmailLabel: 'Correo', inviteNameLabel: 'Nombre', inviteNamePlaceholder: 'Opcional',
    inviteRoleLabel: 'Rol', roleAdminDescription: 'Puede gestionar miembros y todas las claves',
    roleMemberDescription: 'Puede ver y gestionar claves', roleViewerDescription: 'Solo lectura',
    emailRequired: 'Ingrese el correo', inviteSuccess: 'Invitación enviada',
    inviteFailed: 'Error al enviar invitación', loadMembersFailed: 'Error al cargar miembros',
    roleUpdateSuccess: 'Rol actualizado', roleUpdateFailed: 'Error al actualizar rol',
    removeConfirmTitle: 'Confirmar eliminación',
    removeConfirmMessage: '¿Eliminar este miembro? Perderá acceso a los recursos del equipo.',
    removeButton: 'Eliminar', removeMemberTooltip: 'Eliminar miembro', removeSuccess: 'Miembro eliminado',
    removeFailed: 'Error al eliminar', resendInviteTooltip: 'Reenviar invitación',
    resendInviteSuccess: 'Invitación reenviada', resendInviteFailed: 'Error al reenviar'
  },
  'pt': {
    statusDisabled: 'Desabilitado', tableHeaderMember: 'Membro', tableHeaderRole: 'Função',
    tableHeaderStatus: 'Status', tableHeaderActions: 'Ações', inviteModalTitle: 'Convidar membro',
    inviteEmailLabel: 'E-mail', inviteNameLabel: 'Nome', inviteNamePlaceholder: 'Opcional',
    inviteRoleLabel: 'Função', roleAdminDescription: 'Pode gerenciar membros e todas as chaves',
    roleMemberDescription: 'Pode ver e gerenciar chaves', roleViewerDescription: 'Somente leitura',
    emailRequired: 'Digite o e-mail', inviteSuccess: 'Convite enviado',
    inviteFailed: 'Falha ao enviar convite', loadMembersFailed: 'Falha ao carregar membros',
    roleUpdateSuccess: 'Função atualizada', roleUpdateFailed: 'Falha ao atualizar função',
    removeConfirmTitle: 'Confirmar remoção',
    removeConfirmMessage: 'Remover este membro? Perderá acesso aos recursos da equipe.',
    removeButton: 'Remover', removeMemberTooltip: 'Remover membro', removeSuccess: 'Membro removido',
    removeFailed: 'Falha ao remover', resendInviteTooltip: 'Reenviar convite',
    resendInviteSuccess: 'Convite reenviado', resendInviteFailed: 'Falha ao reenviar'
  },
  'ru': {
    statusDisabled: 'Отключен', tableHeaderMember: 'Участник', tableHeaderRole: 'Роль',
    tableHeaderStatus: 'Статус', tableHeaderActions: 'Действия', inviteModalTitle: 'Пригласить участника',
    inviteEmailLabel: 'Эл. почта', inviteNameLabel: 'Имя', inviteNamePlaceholder: 'Опционально',
    inviteRoleLabel: 'Роль', roleAdminDescription: 'Может управлять участниками и всеми ключами',
    roleMemberDescription: 'Может просматривать и управлять ключами', roleViewerDescription: 'Только просмотр',
    emailRequired: 'Введите эл. почту', inviteSuccess: 'Приглашение отправлено',
    inviteFailed: 'Ошибка отправки приглашения', loadMembersFailed: 'Ошибка загрузки участников',
    roleUpdateSuccess: 'Роль обновлена', roleUpdateFailed: 'Ошибка обновления роли',
    removeConfirmTitle: 'Подтвердить удаление',
    removeConfirmMessage: 'Удалить этого участника? Он потеряет доступ к ресурсам команды.',
    removeButton: 'Удалить', removeMemberTooltip: 'Удалить участника', removeSuccess: 'Участник удален',
    removeFailed: 'Ошибка удаления', resendInviteTooltip: 'Отправить повторно',
    resendInviteSuccess: 'Приглашение отправлено повторно', resendInviteFailed: 'Ошибка повторной отправки'
  },
  'id': {
    statusDisabled: 'Dinonaktifkan', tableHeaderMember: 'Anggota', tableHeaderRole: 'Peran',
    tableHeaderStatus: 'Status', tableHeaderActions: 'Aksi', inviteModalTitle: 'Undang anggota',
    inviteEmailLabel: 'Email', inviteNameLabel: 'Nama', inviteNamePlaceholder: 'Opsional',
    inviteRoleLabel: 'Peran', roleAdminDescription: 'Dapat mengelola anggota dan semua kunci',
    roleMemberDescription: 'Dapat melihat dan mengelola kunci', roleViewerDescription: 'Hanya lihat',
    emailRequired: 'Masukkan email', inviteSuccess: 'Undangan terkirim',
    inviteFailed: 'Gagal mengirim undangan', loadMembersFailed: 'Gagal memuat anggota',
    roleUpdateSuccess: 'Peran diperbarui', roleUpdateFailed: 'Gagal memperbarui peran',
    removeConfirmTitle: 'Konfirmasi penghapusan',
    removeConfirmMessage: 'Hapus anggota ini? Mereka akan kehilangan akses ke sumber daya tim.',
    removeButton: 'Hapus', removeMemberTooltip: 'Hapus anggota', removeSuccess: 'Anggota dihapus',
    removeFailed: 'Gagal menghapus', resendInviteTooltip: 'Kirim ulang undangan',
    resendInviteSuccess: 'Undangan dikirim ulang', resendInviteFailed: 'Gagal mengirim ulang'
  }
};

// 完整的 platformAccounts 模块翻译
const platformAccountsTranslations = {
  'es': {
    addAccountModal: 'Agregar cuenta de plataforma', editAccountModal: 'Editar cuenta de plataforma',
    addFirstAccount: 'Agregar primera cuenta', updateSuccessMessage: 'Cuenta actualizada',
    platformCannotChange: 'No se puede cambiar el tipo de plataforma en modo edición',
    adminApiKeyPlaceholderEdit: 'Dejar en blanco para mantener la clave actual',
    adminApiKeyHintEdit: 'Dejar en blanco para mantener, ingresar nueva clave para actualizar',
    accountNamePlaceholder: 'ej: Cuenta principal de empresa', adminApiKeyPlaceholder: 'Ingrese la clave API Admin de {{platform}}',
    adminApiKeyHint: 'Clave de administrador para crear y gestionar sub-claves via API',
    projectId: 'ID de Proyecto', projectIdPlaceholder: 'Ingrese ID de proyecto OpenAI',
    projectIdHint: 'ID de proyecto OpenAI para crear y gestionar claves API',
    organizationId: 'ID de Organización', organizationIdOptional: 'Opcional',
    organizationIdPlaceholder: 'Ingrese ID de organización (opcional)', configuring: 'Configurando...',
    saveAndVerify: 'Guardar y Verificar', errorAccountNameRequired: 'Ingrese nombre de cuenta',
    errorAdminApiKeyRequired: 'Ingrese clave API Admin', errorProjectIdRequired: 'Ingrese ID de proyecto',
    errorConfigFailed: 'Error de configuración', successMessage: '¡Cuenta configurada!',
    confirmDelete: '¿Eliminar esta configuración? No podrá crear nuevas claves via API.',
    deleteNotImplemented: 'Función de eliminación no implementada',
    'guide.openai.step1': 'Inicie sesión en OpenAI Platform (platform.openai.com)',
    'guide.openai.step2': 'Vaya a Settings → Organization → API Keys',
    'guide.openai.step3': 'Haga clic en "Create new secret key", seleccione permisos "All"',
    'guide.openai.step4': 'Copie el Project ID desde Settings → Organization → Projects',
    'guide.openai.note': 'OpenAI requiere tanto API Key Admin como Project ID. Asegúrese de tener permisos de administrador.',
    'guide.anthropic.step1': 'Inicie sesión en Anthropic Console (console.anthropic.com)',
    'guide.anthropic.step2': 'Vaya a Settings → API Keys',
    'guide.anthropic.step3': 'Haga clic en "Create Key" y copie la clave generada',
    'guide.anthropic.note': 'La clave API de Anthropic solo se muestra una vez. Guárdela de forma segura.',
    'guide.openrouter.step1': 'Inicie sesión en OpenRouter (openrouter.ai)',
    'guide.openrouter.step2': 'Haga clic en su avatar → Keys',
    'guide.openrouter.step3': 'Haga clic en "Create Key" y copie la clave generada',
    'guide.volcengine.step1': 'Inicie sesión en Volcengine Console (console.volcengine.com)',
    'guide.volcengine.step2': 'Haga clic en su avatar → Clave de acceso API',
    'guide.volcengine.step3': 'Haga clic en "Crear" para generar AccessKey ID y Secret AccessKey',
    'guide.volcengine.step4': 'Copie tanto AccessKey ID (AK) como Secret AccessKey (SK)',
    'guide.volcengine.note': 'Volcengine requiere tanto AK como SK. SK solo se muestra una vez, guárdelo inmediatamente.'
  },
  'pt': {
    addAccountModal: 'Adicionar conta de plataforma', editAccountModal: 'Editar conta de plataforma',
    addFirstAccount: 'Adicionar primeira conta', updateSuccessMessage: 'Conta atualizada',
    platformCannotChange: 'Não é possível alterar o tipo de plataforma no modo edição',
    adminApiKeyPlaceholderEdit: 'Deixe em branco para manter a chave atual',
    adminApiKeyHintEdit: 'Deixe em branco para manter, digite nova chave para atualizar',
    accountNamePlaceholder: 'ex: Conta principal da empresa', adminApiKeyPlaceholder: 'Digite a chave API Admin de {{platform}}',
    adminApiKeyHint: 'Chave de administrador para criar e gerenciar sub-chaves via API',
    projectId: 'ID do Projeto', projectIdPlaceholder: 'Digite ID do projeto OpenAI',
    projectIdHint: 'ID do projeto OpenAI para criar e gerenciar chaves API',
    organizationId: 'ID da Organização', organizationIdOptional: 'Opcional',
    organizationIdPlaceholder: 'Digite ID da organização (opcional)', configuring: 'Configurando...',
    saveAndVerify: 'Salvar e Verificar', errorAccountNameRequired: 'Digite nome da conta',
    errorAdminApiKeyRequired: 'Digite chave API Admin', errorProjectIdRequired: 'Digite ID do projeto',
    errorConfigFailed: 'Erro de configuração', successMessage: 'Conta configurada!',
    confirmDelete: 'Excluir esta configuração? Não poderá criar novas chaves via API.',
    deleteNotImplemented: 'Função de exclusão não implementada',
    'guide.openai.step1': 'Faça login na OpenAI Platform (platform.openai.com)',
    'guide.openai.step2': 'Vá para Settings → Organization → API Keys',
    'guide.openai.step3': 'Clique em "Create new secret key", selecione permissões "All"',
    'guide.openai.step4': 'Copie o Project ID de Settings → Organization → Projects',
    'guide.openai.note': 'OpenAI requer tanto API Key Admin quanto Project ID. Certifique-se de ter permissões de administrador.',
    'guide.anthropic.step1': 'Faça login no Anthropic Console (console.anthropic.com)',
    'guide.anthropic.step2': 'Vá para Settings → API Keys',
    'guide.anthropic.step3': 'Clique em "Create Key" e copie a chave gerada',
    'guide.anthropic.note': 'A chave API da Anthropic só é exibida uma vez. Guarde-a com segurança.',
    'guide.openrouter.step1': 'Faça login no OpenRouter (openrouter.ai)',
    'guide.openrouter.step2': 'Clique no seu avatar → Keys',
    'guide.openrouter.step3': 'Clique em "Create Key" e copie a chave gerada',
    'guide.volcengine.step1': 'Faça login no Volcengine Console (console.volcengine.com)',
    'guide.volcengine.step2': 'Clique no seu avatar → Chave de acesso API',
    'guide.volcengine.step3': 'Clique em "Criar" para gerar AccessKey ID e Secret AccessKey',
    'guide.volcengine.step4': 'Copie tanto AccessKey ID (AK) quanto Secret AccessKey (SK)',
    'guide.volcengine.note': 'Volcengine requer tanto AK quanto SK. SK só é exibido uma vez, salve imediatamente.'
  },
  'ru': {
    addAccountModal: 'Добавить аккаунт платформы', editAccountModal: 'Редактировать аккаунт платформы',
    addFirstAccount: 'Добавить первый аккаунт', updateSuccessMessage: 'Аккаунт обновлен',
    platformCannotChange: 'Нельзя изменить тип платформы в режиме редактирования',
    adminApiKeyPlaceholderEdit: 'Оставьте пустым, чтобы сохранить текущий ключ',
    adminApiKeyHintEdit: 'Оставьте пустым, чтобы сохранить, введите новый ключ для обновления',
    accountNamePlaceholder: 'напр: Основной аккаунт компании', adminApiKeyPlaceholder: 'Введите Admin API ключ {{platform}}',
    adminApiKeyHint: 'Ключ администратора для создания и управления под-ключами через API',
    projectId: 'ID проекта', projectIdPlaceholder: 'Введите ID проекта OpenAI',
    projectIdHint: 'ID проекта OpenAI для создания и управления API ключами',
    organizationId: 'ID организации', organizationIdOptional: 'Опционально',
    organizationIdPlaceholder: 'Введите ID организации (опционально)', configuring: 'Настройка...',
    saveAndVerify: 'Сохранить и проверить', errorAccountNameRequired: 'Введите название аккаунта',
    errorAdminApiKeyRequired: 'Введите Admin API ключ', errorProjectIdRequired: 'Введите ID проекта',
    errorConfigFailed: 'Ошибка конфигурации', successMessage: 'Аккаунт настроен!',
    confirmDelete: 'Удалить эту конфигурацию? Вы не сможете создавать новые ключи через API.',
    deleteNotImplemented: 'Функция удаления не реализована',
    'guide.openai.step1': 'Войдите в OpenAI Platform (platform.openai.com)',
    'guide.openai.step2': 'Перейдите в Settings → Organization → API Keys',
    'guide.openai.step3': 'Нажмите "Create new secret key", выберите права "All"',
    'guide.openai.step4': 'Скопируйте Project ID из Settings → Organization → Projects',
    'guide.openai.note': 'OpenAI требует как Admin API ключ, так и Project ID. Убедитесь, что у вас есть права администратора.',
    'guide.anthropic.step1': 'Войдите в Anthropic Console (console.anthropic.com)',
    'guide.anthropic.step2': 'Перейдите в Settings → API Keys',
    'guide.anthropic.step3': 'Нажмите "Create Key" и скопируйте сгенерированный ключ',
    'guide.anthropic.note': 'API ключ Anthropic показывается только один раз. Сохраните его в безопасном месте.',
    'guide.openrouter.step1': 'Войдите в OpenRouter (openrouter.ai)',
    'guide.openrouter.step2': 'Нажмите на аватар → Keys',
    'guide.openrouter.step3': 'Нажмите "Create Key" и скопируйте сгенерированный ключ',
    'guide.volcengine.step1': 'Войдите в Volcengine Console (console.volcengine.com)',
    'guide.volcengine.step2': 'Нажмите на аватар → Ключ доступа API',
    'guide.volcengine.step3': 'Нажмите "Создать" для генерации AccessKey ID и Secret AccessKey',
    'guide.volcengine.step4': 'Скопируйте и AccessKey ID (AK), и Secret AccessKey (SK)',
    'guide.volcengine.note': 'Volcengine требует и AK, и SK. SK показывается только один раз, сохраните сразу.'
  },
  'id': {
    addAccountModal: 'Tambah akun platform', editAccountModal: 'Edit akun platform',
    addFirstAccount: 'Tambah akun pertama', updateSuccessMessage: 'Akun diperbarui',
    platformCannotChange: 'Tidak dapat mengubah jenis platform dalam mode edit',
    adminApiKeyPlaceholderEdit: 'Biarkan kosong untuk mempertahankan kunci saat ini',
    adminApiKeyHintEdit: 'Biarkan kosong untuk mempertahankan, masukkan kunci baru untuk memperbarui',
    accountNamePlaceholder: 'cth: Akun utama perusahaan', adminApiKeyPlaceholder: 'Masukkan kunci API Admin {{platform}}',
    adminApiKeyHint: 'Kunci administrator untuk membuat dan mengelola sub-kunci via API',
    projectId: 'ID Proyek', projectIdPlaceholder: 'Masukkan ID proyek OpenAI',
    projectIdHint: 'ID proyek OpenAI untuk membuat dan mengelola kunci API',
    organizationId: 'ID Organisasi', organizationIdOptional: 'Opsional',
    organizationIdPlaceholder: 'Masukkan ID organisasi (opsional)', configuring: 'Mengonfigurasi...',
    saveAndVerify: 'Simpan dan Verifikasi', errorAccountNameRequired: 'Masukkan nama akun',
    errorAdminApiKeyRequired: 'Masukkan kunci API Admin', errorProjectIdRequired: 'Masukkan ID proyek',
    errorConfigFailed: 'Konfigurasi gagal', successMessage: 'Akun dikonfigurasi!',
    confirmDelete: 'Hapus konfigurasi ini? Tidak dapat membuat kunci baru via API.',
    deleteNotImplemented: 'Fungsi hapus belum diimplementasi',
    'guide.openai.step1': 'Masuk ke OpenAI Platform (platform.openai.com)',
    'guide.openai.step2': 'Buka Settings → Organization → API Keys',
    'guide.openai.step3': 'Klik "Create new secret key", pilih izin "All"',
    'guide.openai.step4': 'Salin Project ID dari Settings → Organization → Projects',
    'guide.openai.note': 'OpenAI memerlukan API Key Admin dan Project ID. Pastikan Anda memiliki izin administrator.',
    'guide.anthropic.step1': 'Masuk ke Anthropic Console (console.anthropic.com)',
    'guide.anthropic.step2': 'Buka Settings → API Keys',
    'guide.anthropic.step3': 'Klik "Create Key" dan salin kunci yang dihasilkan',
    'guide.anthropic.note': 'Kunci API Anthropic hanya ditampilkan sekali. Simpan dengan aman.',
    'guide.openrouter.step1': 'Masuk ke OpenRouter (openrouter.ai)',
    'guide.openrouter.step2': 'Klik avatar Anda → Keys',
    'guide.openrouter.step3': 'Klik "Create Key" dan salin kunci yang dihasilkan',
    'guide.volcengine.step1': 'Masuk ke Volcengine Console (console.volcengine.com)',
    'guide.volcengine.step2': 'Klik avatar Anda → Kunci akses API',
    'guide.volcengine.step3': 'Klik "Buat" untuk menghasilkan AccessKey ID dan Secret AccessKey',
    'guide.volcengine.step4': 'Salin AccessKey ID (AK) dan Secret AccessKey (SK)',
    'guide.volcengine.note': 'Volcengine memerlukan AK dan SK. SK hanya ditampilkan sekali, segera simpan.'
  }
};

// 设置嵌套对象的值
function setNestedValue(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

// 获取语言代码
function getLangCode(filename) {
  return filename.replace('.json', '').replace('-', '-');
}

// 简化语言代码
function getSimpleLangCode(filename) {
  const code = filename.replace('.json', '');
  if (code === 'en-US') return 'en';
  if (code === 'zh-CN') return 'zh-CN';
  if (code === 'zh-TW') return 'zh-TW';
  return code;
}

// 主函数
function fixTranslations() {
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== baseLocale);
  
  for (const file of files) {
    const filePath = path.join(localesDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const langCode = getSimpleLangCode(file);
    
    let fixed = 0;
    
    // 1. 修复通用翻译
    for (const [keyPath, langValues] of Object.entries(translations)) {
      const value = langValues[langCode];
      if (value) {
        const parts = keyPath.split('.');
        let current = content;
        let needsFix = false;
        
        for (let i = 0; i < parts.length; i++) {
          if (i === parts.length - 1) {
            if (!(parts[i] in current)) {
              needsFix = true;
            }
          } else {
            if (!(parts[i] in current)) {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }
        }
        
        if (needsFix) {
          setNestedValue(content, keyPath, value);
          fixed++;
        }
      }
    }
    
    // 2. 修复 team 模块（仅适用于 es, pt, ru, id）
    if (teamTranslations[langCode]) {
      if (!content.team) content.team = {};
      for (const [key, value] of Object.entries(teamTranslations[langCode])) {
        if (!(key in content.team)) {
          content.team[key] = value;
          fixed++;
        }
      }
    }
    
    // 3. 修复 platformAccounts 模块（仅适用于 es, pt, ru, id）
    if (platformAccountsTranslations[langCode]) {
      if (!content.platformAccounts) content.platformAccounts = {};
      if (!content.platformAccounts.guide) content.platformAccounts.guide = {};
      
      for (const [key, value] of Object.entries(platformAccountsTranslations[langCode])) {
        if (key.startsWith('guide.')) {
          const guideParts = key.split('.');
          const platform = guideParts[1];
          const field = guideParts[2];
          
          if (!content.platformAccounts.guide[platform]) {
            content.platformAccounts.guide[platform] = {};
          }
          if (!(field in content.platformAccounts.guide[platform])) {
            content.platformAccounts.guide[platform][field] = value;
            fixed++;
          }
        } else {
          if (!(key in content.platformAccounts)) {
            content.platformAccounts[key] = value;
            fixed++;
          }
        }
      }
    }
    
    if (fixed > 0) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf-8');
      console.log(`✅ ${file}: 修复了 ${fixed} 个翻译`);
    } else {
      console.log(`⏭️  ${file}: 无需修复`);
    }
  }
}

fixTranslations();
console.log('\n🎉 翻译修复完成！请重新运行 check-i18n.js 验证结果。\n');


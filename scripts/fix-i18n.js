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
  
  // Common
  'common.clearSelection': {
    'zh-TW': '取消選擇', 'ja': '選択解除', 'ko': '선택 해제',
    'de': 'Auswahl aufheben', 'fr': 'Désélectionner', 'es': 'Deseleccionar',
    'pt': 'Limpar seleção', 'ru': 'Снять выбор', 'id': 'Hapus pilihan'
  },
  'common.minutesAgo': {
    'zh-TW': '{{count}} 分鐘前', 'ja': '{{count}} 分前', 'ko': '{{count}}분 전',
    'de': 'Vor {{count}} Minuten', 'fr': 'Il y a {{count}} minutes', 'es': 'Hace {{count}} minutos',
    'pt': 'Há {{count}} minutos', 'ru': '{{count}} минут назад', 'id': '{{count}} menit yang lalu'
  },
  'common.hoursAgo': {
    'zh-TW': '{{count}} 小時前', 'ja': '{{count}} 時間前', 'ko': '{{count}}시간 전',
    'de': 'Vor {{count}} Stunden', 'fr': 'Il y a {{count}} heures', 'es': 'Hace {{count}} horas',
    'pt': 'Há {{count}} horas', 'ru': '{{count}} часов назад', 'id': '{{count}} jam yang lalu'
  },
  'common.yesterday': {
    'zh-TW': '昨天', 'ja': '昨日', 'ko': '어제',
    'de': 'Gestern', 'fr': 'Hier', 'es': 'Ayer', 'pt': 'Ontem', 'ru': 'Вчера', 'id': 'Kemarin'
  },
  'common.daysAgo': {
    'zh-TW': '{{count}} 天前', 'ja': '{{count}} 日前', 'ko': '{{count}}일 전',
    'de': 'Vor {{count}} Tagen', 'fr': 'Il y a {{count}} jours', 'es': 'Hace {{count}} días',
    'pt': 'Há {{count}} dias', 'ru': '{{count}} дней назад', 'id': '{{count}} hari yang lalu'
  },
  'common.expiresInDays': {
    'zh-TW': '{{count}} 天後過期', 'ja': '{{count}} 日後に期限切れ', 'ko': '{{count}}일 후 만료',
    'de': 'Läuft in {{count}} Tagen ab', 'fr': 'Expire dans {{count}} jours', 'es': 'Expira en {{count}} días',
    'pt': 'Expira em {{count}} dias', 'ru': 'Истекает через {{count}} дней', 'id': 'Kedaluwarsa dalam {{count}} hari'
  },
  'common.export': {
    'zh-TW': '匯出', 'ja': 'エクスポート', 'ko': '내보내기',
    'de': 'Exportieren', 'fr': 'Exporter', 'es': 'Exportar', 'pt': 'Exportar', 'ru': 'Экспорт', 'id': 'Ekspor'
  },
  'common.exportCsv': {
    'zh-TW': '匯出 CSV', 'ja': 'CSV エクスポート', 'ko': 'CSV 내보내기',
    'de': 'Als CSV exportieren', 'fr': 'Exporter en CSV', 'es': 'Exportar CSV', 'pt': 'Exportar CSV', 'ru': 'Экспорт CSV', 'id': 'Ekspor CSV'
  },
  'common.exportExcel': {
    'zh-TW': '匯出 Excel', 'ja': 'Excel エクスポート', 'ko': 'Excel 내보내기',
    'de': 'Als Excel exportieren', 'fr': 'Exporter en Excel', 'es': 'Exportar Excel', 'pt': 'Exportar Excel', 'ru': 'Экспорт Excel', 'id': 'Ekspor Excel'
  },
  'common.exportSelected': {
    'zh-TW': '匯出選中的 {{count}} 個', 'ja': '選択した {{count}} 件をエクスポート', 'ko': '선택한 {{count}}개 내보내기',
    'de': '{{count}} ausgewählte exportieren', 'fr': 'Exporter {{count}} sélectionnés', 'es': 'Exportar {{count}} seleccionados',
    'pt': 'Exportar {{count}} selecionados', 'ru': 'Экспорт {{count}} выбранных', 'id': 'Ekspor {{count}} yang dipilih'
  },
  'common.exportAll': {
    'zh-TW': '匯出全部', 'ja': 'すべてエクスポート', 'ko': '전체 내보내기',
    'de': 'Alle exportieren', 'fr': 'Tout exporter', 'es': 'Exportar todo', 'pt': 'Exportar tudo', 'ru': 'Экспортировать все', 'id': 'Ekspor semua'
  },
  'common.exportedCount': {
    'zh-TW': '已匯出 {{count}} 個 API Key', 'ja': '{{count}} 件のAPIキーをエクスポートしました', 'ko': '{{count}}개의 API 키를 내보냈습니다',
    'de': '{{count}} API-Schlüssel exportiert', 'fr': '{{count}} clés API exportées', 'es': '{{count}} claves API exportadas',
    'pt': '{{count}} chaves API exportadas', 'ru': 'Экспортировано {{count}} API ключей', 'id': '{{count}} kunci API diekspor'
  },
  'common.unlockExport': {
    'zh-TW': '升級解鎖匯出功能', 'ja': 'アップグレードしてエクスポート機能を解除', 'ko': '업그레이드하여 내보내기 잠금 해제',
    'de': 'Upgrade zum Freischalten des Exports', 'fr': 'Mise à niveau pour déverrouiller l\'export', 'es': 'Actualizar para desbloquear exportación',
    'pt': 'Atualizar para desbloquear exportação', 'ru': 'Обновите для разблокировки экспорта', 'id': 'Tingkatkan untuk membuka ekspor'
  },
  
  // API Keys - Advanced Filter
  'apiKeys.advancedFilter': {
    'zh-TW': '進階篩選', 'ja': '詳細フィルター', 'ko': '고급 필터',
    'de': 'Erweiterter Filter', 'fr': 'Filtre avancé', 'es': 'Filtro avanzado',
    'pt': 'Filtro avançado', 'ru': 'Расширенный фильтр', 'id': 'Filter lanjutan'
  },
  'apiKeys.billingMonth': {
    'zh-TW': '帳單月份', 'ja': '請求月', 'ko': '청구 월',
    'de': 'Abrechnungsmonat', 'fr': 'Mois de facturation', 'es': 'Mes de facturación',
    'pt': 'Mês de faturamento', 'ru': 'Расчетный месяц', 'id': 'Bulan tagihan'
  },
  'apiKeys.allMonths': {
    'zh-TW': '全部月份', 'ja': 'すべての月', 'ko': '전체 월',
    'de': 'Alle Monate', 'fr': 'Tous les mois', 'es': 'Todos los meses',
    'pt': 'Todos os meses', 'ru': 'Все месяцы', 'id': 'Semua bulan'
  },
  'apiKeys.currentMonth': {
    'zh-TW': '當前', 'ja': '今月', 'ko': '현재',
    'de': 'Aktuell', 'fr': 'Actuel', 'es': 'Actual',
    'pt': 'Atual', 'ru': 'Текущий', 'id': 'Saat ini'
  },
  'apiKeys.usageFilter': {
    'zh-TW': '用量狀態', 'ja': '使用量ステータス', 'ko': '사용량 상태',
    'de': 'Nutzungsstatus', 'fr': 'État d\'utilisation', 'es': 'Estado de uso',
    'pt': 'Status de uso', 'ru': 'Статус использования', 'id': 'Status penggunaan'
  },
  'apiKeys.allKeys': {
    'zh-TW': '全部 Key', 'ja': 'すべてのキー', 'ko': '전체 키',
    'de': 'Alle Schlüssel', 'fr': 'Toutes les clés', 'es': 'Todas las claves',
    'pt': 'Todas as chaves', 'ru': 'Все ключи', 'id': 'Semua kunci'
  },
  'apiKeys.hasUsage': {
    'zh-TW': '本月有用量', 'ja': '今月使用あり', 'ko': '이번 달 사용 있음',
    'de': 'Hat Nutzung diesen Monat', 'fr': 'A une utilisation ce mois', 'es': 'Tiene uso este mes',
    'pt': 'Tem uso este mês', 'ru': 'Есть использование в этом месяце', 'id': 'Ada penggunaan bulan ini'
  },
  'apiKeys.noUsage': {
    'zh-TW': '無用量', 'ja': '使用なし', 'ko': '사용 없음',
    'de': 'Keine Nutzung', 'fr': 'Pas d\'utilisation', 'es': 'Sin uso',
    'pt': 'Sem uso', 'ru': 'Нет использования', 'id': 'Tidak ada penggunaan'
  },
  'apiKeys.clearAllFilters': {
    'zh-TW': '清除所有篩選條件', 'ja': 'すべてのフィルターをクリア', 'ko': '모든 필터 지우기',
    'de': 'Alle Filter löschen', 'fr': 'Effacer tous les filtres', 'es': 'Borrar todos los filtros',
    'pt': 'Limpar todos os filtros', 'ru': 'Очистить все фильтры', 'id': 'Hapus semua filter'
  },
  'apiKeys.monthlyUsageRange': {
    'zh-TW': '月用量範圍 (K tokens)', 'ja': '月間使用量範囲 (K tokens)', 'ko': '월간 사용량 범위 (K tokens)',
    'de': 'Monatliche Nutzung (K Tokens)', 'fr': 'Utilisation mensuelle (K tokens)', 'es': 'Uso mensual (K tokens)',
    'pt': 'Uso mensal (K tokens)', 'ru': 'Месячное использование (K токенов)', 'id': 'Penggunaan bulanan (K token)'
  },
  'apiKeys.minLabel': {
    'zh-TW': '最小', 'ja': '最小', 'ko': '최소',
    'de': 'Min', 'fr': 'Min', 'es': 'Mín', 'pt': 'Mín', 'ru': 'Мин', 'id': 'Min'
  },
  'apiKeys.maxLabel': {
    'zh-TW': '最大', 'ja': '最大', 'ko': '최대',
    'de': 'Max', 'fr': 'Max', 'es': 'Máx', 'pt': 'Máx', 'ru': 'Макс', 'id': 'Maks'
  },
  'apiKeys.assignOwner': {
    'zh-TW': '分配負責人', 'ja': '担当者を割り当て', 'ko': '담당자 지정',
    'de': 'Verantwortlichen zuweisen', 'fr': 'Attribuer un responsable', 'es': 'Asignar propietario',
    'pt': 'Atribuir proprietário', 'ru': 'Назначить владельца', 'id': 'Tetapkan pemilik'
  },
  'apiKeys.batchAssignOwner': {
    'zh-TW': '批次分配負責人', 'ja': '一括担当者割り当て', 'ko': '일괄 담당자 지정',
    'de': 'Stapelzuweisung', 'fr': 'Attribution en lot', 'es': 'Asignación por lotes',
    'pt': 'Atribuição em lote', 'ru': 'Массовое назначение', 'id': 'Tetapkan massal'
  },
  'apiKeys.batchAssignOwnerDesc': {
    'zh-TW': '將為 {{count}} 個 Key 分配相同的負責人', 'ja': '{{count}} 個のキーに同じ担当者を割り当てます', 'ko': '{{count}}개의 키에 동일한 담당자를 지정합니다',
    'de': '{{count}} Schlüssel demselben Verantwortlichen zuweisen', 'fr': 'Attribuer le même responsable à {{count}} clés', 'es': 'Asignar el mismo propietario a {{count}} claves',
    'pt': 'Atribuir o mesmo proprietário a {{count}} chaves', 'ru': 'Назначить одного владельца для {{count}} ключей', 'id': 'Tetapkan pemilik yang sama untuk {{count}} kunci'
  },
  'apiKeys.clearOwner': {
    'zh-TW': '清除負責人', 'ja': '担当者をクリア', 'ko': '담당자 삭제',
    'de': 'Verantwortlichen entfernen', 'fr': 'Effacer le responsable', 'es': 'Borrar propietario',
    'pt': 'Limpar proprietário', 'ru': 'Очистить владельца', 'id': 'Hapus pemilik'
  },
  'apiKeys.ownerCleared': {
    'zh-TW': '已清除負責人資訊', 'ja': '担当者情報をクリアしました', 'ko': '담당자 정보가 삭제되었습니다',
    'de': 'Verantwortlicher entfernt', 'fr': 'Responsable effacé', 'es': 'Propietario borrado',
    'pt': 'Proprietário removido', 'ru': 'Владелец удален', 'id': 'Pemilik dihapus'
  },
  'apiKeys.selectOwnerFromTeam': {
    'zh-TW': '請從團隊成員中選擇負責人。如果成員不存在，請先在「團隊」頁面添加成員。',
    'ja': 'チームメンバーから担当者を選択してください。メンバーが存在しない場合は、先に「チーム」ページで追加してください。',
    'ko': '팀 멤버에서 담당자를 선택하세요. 멤버가 없으면 먼저 "팀" 페이지에서 추가하세요.',
    'de': 'Bitte wählen Sie einen Verantwortlichen aus den Teammitgliedern. Falls das Mitglied nicht existiert, fügen Sie es bitte zuerst auf der "Team"-Seite hinzu.',
    'fr': 'Veuillez sélectionner un responsable parmi les membres de l\'équipe. Si le membre n\'existe pas, ajoutez-le d\'abord sur la page "Équipe".',
    'es': 'Seleccione un propietario de los miembros del equipo. Si el miembro no existe, agréguelo primero en la página "Equipo".',
    'pt': 'Selecione um proprietário dos membros da equipe. Se o membro não existir, adicione-o primeiro na página "Equipe".',
    'ru': 'Пожалуйста, выберите владельца из членов команды. Если участник отсутствует, сначала добавьте его на странице "Команда".',
    'id': 'Silakan pilih pemilik dari anggota tim. Jika anggota tidak ada, tambahkan terlebih dahulu di halaman "Tim".'
  },
  'apiKeys.selectOwnerRequired': {
    'zh-TW': '選擇負責人', 'ja': '担当者を選択', 'ko': '담당자 선택',
    'de': 'Verantwortlichen wählen', 'fr': 'Sélectionner un responsable', 'es': 'Seleccionar propietario',
    'pt': 'Selecionar proprietário', 'ru': 'Выбрать владельца', 'id': 'Pilih pemilik'
  },
  'apiKeys.ownerSetSuccess': {
    'zh-TW': '已設定負責人: {{name}}', 'ja': '担当者を設定しました: {{name}}', 'ko': '담당자 설정됨: {{name}}',
    'de': 'Verantwortlicher festgelegt: {{name}}', 'fr': 'Responsable défini: {{name}}', 'es': 'Propietario establecido: {{name}}',
    'pt': 'Proprietário definido: {{name}}', 'ru': 'Владелец установлен: {{name}}', 'id': 'Pemilik ditetapkan: {{name}}'
  },
  'apiKeys.batchOwnerSuccess': {
    'zh-TW': '成功為 {{count}} 個 Key 分配負責人', 'ja': '{{count}} 個のキーに担当者を割り当てました', 'ko': '{{count}}개의 키에 담당자를 지정했습니다',
    'de': '{{count}} Schlüssel erfolgreich zugewiesen', 'fr': '{{count}} clés attribuées avec succès', 'es': '{{count}} claves asignadas con éxito',
    'pt': '{{count}} chaves atribuídas com sucesso', 'ru': 'Успешно назначено {{count}} ключей', 'id': 'Berhasil menetapkan {{count}} kunci'
  },
  'apiKeys.selectMemberPlaceholder': {
    'zh-TW': '-- 請選擇團隊成員 --', 'ja': '-- チームメンバーを選択 --', 'ko': '-- 팀 멤버 선택 --',
    'de': '-- Teammitglied wählen --', 'fr': '-- Sélectionner un membre --', 'es': '-- Seleccionar miembro --',
    'pt': '-- Selecionar membro --', 'ru': '-- Выбрать участника --', 'id': '-- Pilih anggota tim --'
  },
  'apiKeys.pendingInvite': {
    'zh-TW': '(待接受邀請)', 'ja': '(招待保留中)', 'ko': '(초대 대기 중)',
    'de': '(Einladung ausstehend)', 'fr': '(Invitation en attente)', 'es': '(Invitación pendiente)',
    'pt': '(Convite pendente)', 'ru': '(Ожидает приглашения)', 'id': '(Menunggu undangan)'
  },
  'apiKeys.noMembersYet': {
    'zh-TW': '暫無團隊成員，請先前往「團隊」頁面添加成員。', 'ja': 'チームメンバーがいません。先に「チーム」ページでメンバーを追加してください。',
    'ko': '팀 멤버가 없습니다. 먼저 "팀" 페이지에서 멤버를 추가하세요.',
    'de': 'Keine Teammitglieder vorhanden. Bitte fügen Sie zuerst Mitglieder auf der "Team"-Seite hinzu.',
    'fr': 'Aucun membre d\'équipe. Veuillez d\'abord ajouter des membres sur la page "Équipe".',
    'es': 'Sin miembros del equipo. Por favor, agregue miembros primero en la página "Equipo".',
    'pt': 'Nenhum membro da equipe. Por favor, adicione membros primeiro na página "Equipe".',
    'ru': 'Нет участников команды. Сначала добавьте участников на странице "Команда".',
    'id': 'Belum ada anggota tim. Silakan tambahkan anggota di halaman "Tim" terlebih dahulu.'
  },
  'apiKeys.confirmBatchAssign': {
    'zh-TW': '確認分配', 'ja': '割り当てを確認', 'ko': '할당 확인',
    'de': 'Zuweisung bestätigen', 'fr': 'Confirmer l\'attribution', 'es': 'Confirmar asignación',
    'pt': 'Confirmar atribuição', 'ru': 'Подтвердить назначение', 'id': 'Konfirmasi penetapan'
  },
  'apiKeys.confirmBatchDelete': {
    'zh-TW': '確定要刪除選中的 {{count}} 個 API Key 嗎？此操作不可撤銷。',
    'ja': '選択した {{count}} 個のAPIキーを削除しますか？この操作は取り消せません。',
    'ko': '선택한 {{count}}개의 API 키를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.',
    'de': 'Möchten Sie {{count}} ausgewählte API-Schlüssel wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    'fr': 'Êtes-vous sûr de vouloir supprimer {{count}} clés API sélectionnées ? Cette action est irréversible.',
    'es': '¿Está seguro de que desea eliminar {{count}} claves API seleccionadas? Esta acción no se puede deshacer.',
    'pt': 'Tem certeza de que deseja excluir {{count}} chaves API selecionadas? Esta ação não pode ser desfeita.',
    'ru': 'Вы уверены, что хотите удалить {{count}} выбранных API ключей? Это действие нельзя отменить.',
    'id': 'Apakah Anda yakin ingin menghapus {{count}} kunci API yang dipilih? Tindakan ini tidak dapat dibatalkan.'
  },
  'apiKeys.saveFailed': {
    'zh-TW': '保存失敗', 'ja': '保存に失敗しました', 'ko': '저장 실패',
    'de': 'Speichern fehlgeschlagen', 'fr': 'Échec de l\'enregistrement', 'es': 'Error al guardar',
    'pt': 'Falha ao salvar', 'ru': 'Ошибка сохранения', 'id': 'Gagal menyimpan'
  },
  'apiKeys.clearFailed': {
    'zh-TW': '清除失敗', 'ja': 'クリアに失敗しました', 'ko': '삭제 실패',
    'de': 'Löschen fehlgeschlagen', 'fr': 'Échec de l\'effacement', 'es': 'Error al borrar',
    'pt': 'Falha ao limpar', 'ru': 'Ошибка очистки', 'id': 'Gagal menghapus'
  },
  'team.selectMemberHint': {
    'zh-TW': '請從團隊成員中選擇負責人。', 'ja': 'チームメンバーから担当者を選択してください。', 'ko': '팀 멤버에서 담당자를 선택하세요.',
    'de': 'Bitte wählen Sie einen Verantwortlichen aus den Teammitgliedern.', 'fr': 'Veuillez sélectionner un responsable parmi les membres de l\'équipe.',
    'es': 'Seleccione un propietario de los miembros del equipo.', 'pt': 'Selecione um proprietário dos membros da equipe.',
    'ru': 'Пожалуйста, выберите владельца из членов команды.', 'id': 'Silakan pilih pemilik dari anggota tim.'
  },
  
  // API Keys - Delete Warning
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
  },
  
  // Landing - Team Plan
  'landing.planTeam': {
    'zh-CN': '团队版', 'zh-TW': '團隊版', 'ja': 'チーム', 'ko': '팀',
    'de': 'Team', 'fr': 'Équipe', 'es': 'Equipo', 'pt': 'Equipe', 'ru': 'Команда', 'id': 'Tim'
  },
  'landing.planTeamDesc': {
    'zh-CN': '适合成长中的团队', 'zh-TW': '適合成長中的團隊', 'ja': '成長するチーム向け', 'ko': '성장하는 팀에 적합',
    'de': 'Für wachsende Teams', 'fr': 'Pour les équipes en croissance', 'es': 'Para equipos en crecimiento', 'pt': 'Para equipes em crescimento', 'ru': 'Для растущих команд', 'id': 'Untuk tim yang berkembang'
  },
  'landing.planTeamFeature1': {
    'zh-CN': '无限 API Keys', 'zh-TW': '無限 API Keys', 'ja': '無制限のAPIキー', 'ko': '무제한 API 키',
    'de': 'Unbegrenzte API-Schlüssel', 'fr': 'Clés API illimitées', 'es': 'Claves API ilimitadas', 'pt': 'Chaves API ilimitadas', 'ru': 'Неограниченные API ключи', 'id': 'Kunci API tidak terbatas'
  },
  'landing.planTeamFeature2': {
    'zh-CN': '无限团队和成员', 'zh-TW': '無限團隊和成員', 'ja': '無制限のチームとメンバー', 'ko': '무제한 팀 및 멤버',
    'de': 'Unbegrenzte Teams & Mitglieder', 'fr': 'Équipes et membres illimités', 'es': 'Equipos y miembros ilimitados', 'pt': 'Equipes e membros ilimitados', 'ru': 'Неограниченные команды и участники', 'id': 'Tim & anggota tidak terbatas'
  },
  'landing.planTeamFeature3': {
    'zh-CN': '高级分析和报表', 'zh-TW': '高級分析和報表', 'ja': '高度な分析とレポート', 'ko': '고급 분석 및 보고서',
    'de': 'Erweiterte Analysen & Berichte', 'fr': 'Analyses et rapports avancés', 'es': 'Análisis e informes avanzados', 'pt': 'Análises e relatórios avançados', 'ru': 'Расширенная аналитика и отчеты', 'id': 'Analitik & laporan lanjutan'
  },
  'landing.planTeamFeature4': {
    'zh-CN': '优先支持', 'zh-TW': '優先支援', 'ja': '優先サポート', 'ko': '우선 지원',
    'de': 'Prioritäts-Support', 'fr': 'Support prioritaire', 'es': 'Soporte prioritario', 'pt': 'Suporte prioritário', 'ru': 'Приоритетная поддержка', 'id': 'Dukungan prioritas'
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


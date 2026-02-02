/**
 * 平台账号配置页面
 * 用于配置 OpenAI、Claude、OpenRouter 等平台的管理员账号信息
 */

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { getLLMPlatformAccounts, addLLMPlatformAccount, updateLLMPlatformAccount } from '../services/api';
import type { LLMPlatformAccount } from '../services/api';

const PLATFORMS = {
  openai: {
    name: 'OpenAI',
    icon: 'simple-icons:openai',
    color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    requiredFields: ['admin_api_key', 'project_id'],
    optionalFields: ['organization_id'],
    guideUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    name: 'Claude (Anthropic)',
    icon: 'simple-icons:anthropic',
    color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
    requiredFields: ['admin_api_key'],
    optionalFields: ['organization_id'],
    guideUrl: 'https://console.anthropic.com/settings/keys',
  },
  openrouter: {
    name: 'OpenRouter',
    icon: 'mdi:router',
    color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    requiredFields: ['admin_api_key'],
    optionalFields: [],
    guideUrl: 'https://openrouter.ai/keys',
  },
  volcengine: {
    name: '火山引擎',
    icon: 'mdi:volcano',
    color: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    requiredFields: ['admin_api_key'],
    optionalFields: [],
    adminKeyFormat: 'AK:SK', // 格式说明：access_key_id:secret_access_key
    guideUrl: 'https://console.volcengine.com/iam/keymanage/',
  },
} as const;

type PlatformType = keyof typeof PLATFORMS;

interface AccountForm {
  name: string;
  platform: PlatformType;
  admin_api_key: string;
  organization_id: string;
  project_id: string;
  access_key_id: string;
  secret_access_key: string;
}

export default function PlatformAccounts() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<LLMPlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<LLMPlatformAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<AccountForm>({
    name: '',
    platform: 'openai',
    admin_api_key: '',
    organization_id: '',
    project_id: '',
    access_key_id: '',
    secret_access_key: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // 加载账号列表
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await getLLMPlatformAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('加载平台账号失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 打开添加账号模态框
  const handleAddAccount = () => {
    setEditingAccount(null);
    setForm({
      name: '',
      platform: 'openai',
      admin_api_key: '',
      organization_id: '',
      project_id: '',
      access_key_id: '',
      secret_access_key: '',
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  // 打开编辑账号模态框
  const handleEditAccount = (account: LLMPlatformAccount) => {
    setEditingAccount(account);
    // 解析火山引擎的 admin_api_key（格式为 "AK:SK"）
    let adminApiKey = '';
    let accessKeyId = '';
    let secretAccessKey = '';
    
    if (account.platform === 'volcengine' && account.admin_api_key_encrypted) {
      // 火山引擎的 admin_api_key_encrypted 格式为 "access_key_id:secret_access_key_base64"
      // AK 部分是明文，SK 部分是 Base64 编码的
      const adminKeyValue = account.admin_api_key_encrypted;
      const parts = adminKeyValue.split(':');
      
      if (parts.length >= 2) {
        accessKeyId = parts[0];
        const secretAccessKeyBase64 = parts.slice(1).join(':'); // 如果 SK 中包含冒号，重新组合
        
        // 解码 SK（Base64）
        try {
          secretAccessKey = atob(secretAccessKeyBase64);
        } catch (e) {
          console.error('SecretAccessKey Base64 解码失败:', e);
          // 解码失败，保持原值（可能是旧格式）
          secretAccessKey = secretAccessKeyBase64;
        }
        
        adminApiKey = adminKeyValue; // 保持原始格式（AK:SK_base64）
      } else {
        adminApiKey = adminKeyValue || '';
      }
    } else {
      adminApiKey = account.admin_api_key_encrypted || '';
    }
    
    setForm({
      name: account.name,
      platform: account.platform as PlatformType,
      admin_api_key: adminApiKey,
      organization_id: account.organization_id || '',
      project_id: account.project_id || '',
      access_key_id: accessKeyId,
      secret_access_key: secretAccessKey,
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      // 验证必填字段
      const platformConfig = PLATFORMS[form.platform];
      if (!form.name.trim()) {
        setError(t('platformAccounts.errorAccountNameRequired'));
        setIsSubmitting(false);
        return;
      }
      // 编辑模式下，API Key 可以为空（表示不更新）
      if (!editingAccount && !form.admin_api_key.trim()) {
        setError(t('platformAccounts.errorAdminApiKeyRequired'));
        setIsSubmitting(false);
        return;
      }
      if ((platformConfig.requiredFields as readonly string[]).includes('project_id') && !form.project_id.trim()) {
        setError(t('platformAccounts.errorProjectIdRequired'));
        setIsSubmitting(false);
        return;
      }

      // 火山引擎的 admin_api_key 格式为 "AK:SK_base64"（SK 需要 Base64 编码）
      let adminApiKey = form.admin_api_key.trim();
      if (form.platform === 'volcengine') {
        // 如果用户分别输入了 access_key_id 和 secret_access_key，组合它们（SK 需要 Base64 编码）
        if (form.access_key_id && form.secret_access_key) {
          const accessKeyId = form.access_key_id.trim();
          const secretAccessKey = form.secret_access_key.trim();
          // 对 SK 进行 Base64 编码
          const secretAccessKeyBase64 = btoa(secretAccessKey);
          adminApiKey = `${accessKeyId}:${secretAccessKeyBase64}`;
        } else if (adminApiKey && !adminApiKey.includes(':')) {
          // 只有在提供了 API Key 时才验证格式
          setError('火山引擎 Admin Key 格式应为 "AK:SK"，请使用冒号分隔 AccessKeyId 和 SecretAccessKey');
          setIsSubmitting(false);
          return;
        } else if (!editingAccount && !adminApiKey && !form.access_key_id && !form.secret_access_key) {
          // 新增模式下必须提供 API Key
          setError('火山引擎 Admin Key 格式应为 "AK:SK"，请使用冒号分隔 AccessKeyId 和 SecretAccessKey');
          setIsSubmitting(false);
          return;
        }
      }

      let result;
      
      if (editingAccount) {
        // 编辑模式：更新账号
        const updateParams: any = {
          name: form.name.trim(),
          organization_id: form.organization_id.trim() || undefined,
          project_id: form.project_id.trim() || undefined,
        };
        
        // 只有提供了新的 API Key 才更新
        if (adminApiKey) {
          updateParams.admin_api_key = adminApiKey;
        }
        
        result = await updateLLMPlatformAccount(editingAccount.id, updateParams);
      } else {
        // 新增模式：添加账号
        result = await addLLMPlatformAccount({
          name: form.name.trim(),
          platform: form.platform,
          admin_api_key: adminApiKey,
          organization_id: form.organization_id.trim() || undefined,
          project_id: form.project_id.trim() || undefined,
        });
      }

      if (result.success) {
        setSuccess(editingAccount ? t('platformAccounts.updateSuccessMessage') : t('platformAccounts.successMessage'));
        setIsModalOpen(false);
        await loadAccounts();
        // 清空表单
        setTimeout(() => {
          setForm({
            name: '',
            platform: 'openai',
            admin_api_key: '',
            organization_id: '',
            project_id: '',
            access_key_id: '',
            secret_access_key: '',
          });
          setEditingAccount(null);
          setSuccess(null);
        }, 2000);
      } else {
        setError(result.error || t('platformAccounts.errorConfigFailed'));
      }
    } catch (err) {
      setError((err as Error).message || t('platformAccounts.errorConfigFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除账号
  const handleDelete = async (accountId: string) => {
    if (!confirm(t('platformAccounts.confirmDelete'))) {
      return;
    }

    try {
      // TODO: 实现删除平台账号的 API
      // const result = await deletePlatformAccount(accountId);
      // if (result.success) {
      //   await loadAccounts();
      // }
      alert(t('platformAccounts.deleteNotImplemented'));
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const platformConfig = PLATFORMS[form.platform];

  return (
    <div className="space-y-6 animate-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('platformAccounts.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('platformAccounts.description')}
          </p>
        </div>
        <button
          onClick={handleAddAccount}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Icon icon="mdi:plus" width={20} />
          {t('platformAccounts.addAccount')}
        </button>
      </div>

      {/* 如何获取 Admin Key 指南 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full px-5 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Icon icon="mdi:help-circle-outline" width={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t('platformAccounts.guideTitle')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('platformAccounts.guideSubtitle')}
              </p>
            </div>
          </div>
          <Icon 
            icon={showGuide ? 'mdi:chevron-up' : 'mdi:chevron-down'} 
            width={24} 
            className="text-gray-400"
          />
        </button>
        
        {showGuide && (
          <div className="px-5 pb-5 space-y-4 border-t border-blue-200 dark:border-blue-800 pt-4">
            {/* OpenAI */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Icon icon="simple-icons:openai" width={18} className="text-green-700 dark:text-green-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white">OpenAI</h4>
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  {t('platformAccounts.openConsole')}
                  <Icon icon="mdi:open-in-new" width={14} />
                </a>
              </div>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                <li>{t('platformAccounts.guide.openai.step1')}</li>
                <li>{t('platformAccounts.guide.openai.step2')}</li>
                <li>{t('platformAccounts.guide.openai.step3')}</li>
                <li>{t('platformAccounts.guide.openai.step4')}</li>
              </ol>
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                <Icon icon="mdi:information" width={16} className="flex-shrink-0 mt-0.5" />
                <span>{t('platformAccounts.guide.openai.note')}</span>
              </div>
            </div>

            {/* Anthropic/Claude */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <Icon icon="simple-icons:anthropic" width={18} className="text-orange-700 dark:text-orange-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Claude (Anthropic)</h4>
                <a 
                  href="https://console.anthropic.com/settings/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  {t('platformAccounts.openConsole')}
                  <Icon icon="mdi:open-in-new" width={14} />
                </a>
              </div>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                <li>{t('platformAccounts.guide.anthropic.step1')}</li>
                <li>{t('platformAccounts.guide.anthropic.step2')}</li>
                <li>{t('platformAccounts.guide.anthropic.step3')}</li>
              </ol>
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                <Icon icon="mdi:information" width={16} className="flex-shrink-0 mt-0.5" />
                <span>{t('platformAccounts.guide.anthropic.note')}</span>
              </div>
            </div>

            {/* OpenRouter */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Icon icon="mdi:router" width={18} className="text-blue-700 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white">OpenRouter</h4>
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  {t('platformAccounts.openConsole')}
                  <Icon icon="mdi:open-in-new" width={14} />
                </a>
              </div>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                <li>{t('platformAccounts.guide.openrouter.step1')}</li>
                <li>{t('platformAccounts.guide.openrouter.step2')}</li>
                <li>{t('platformAccounts.guide.openrouter.step3')}</li>
              </ol>
            </div>

            {/* 火山引擎 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Icon icon="mdi:volcano" width={18} className="text-red-700 dark:text-red-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{t('platformAccounts.volcengine')}</h4>
                <a 
                  href="https://console.volcengine.com/iam/keymanage/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  {t('platformAccounts.openConsole')}
                  <Icon icon="mdi:open-in-new" width={14} />
                </a>
              </div>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                <li>{t('platformAccounts.guide.volcengine.step1')}</li>
                <li>{t('platformAccounts.guide.volcengine.step2')}</li>
                <li>{t('platformAccounts.guide.volcengine.step3')}</li>
                <li>{t('platformAccounts.guide.volcengine.step4')}</li>
              </ol>
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                <Icon icon="mdi:information" width={16} className="flex-shrink-0 mt-0.5" />
                <span>{t('platformAccounts.guide.volcengine.note')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 账号列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Icon icon="mdi:loading" width={32} className="animate-spin text-gray-400" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Icon icon="mdi:cloud-off-outline" width={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('platformAccounts.noAccounts')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {t('platformAccounts.noAccountsDesc')}
          </p>
          <button
            onClick={handleAddAccount}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium inline-flex items-center gap-2"
          >
            <Icon icon="mdi:plus" width={18} />
            {t('platformAccounts.addFirstAccount')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const platform = PLATFORMS[account.platform as PlatformType];
            return (
              <div
                key={account.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center`}>
                      <Icon icon={platform.icon} width={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {account.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {platform.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      account.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {account.status === 'active' ? t('platformAccounts.statusActive') : account.status}
                    </span>
                    <button
                      onClick={() => handleEditAccount(account)}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title={t('common.edit')}
                    >
                      <Icon icon="mdi:pencil-outline" width={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title={t('common.delete')}
                    >
                      <Icon icon="mdi:delete-outline" width={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {account.admin_api_key_prefix && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Icon icon="mdi:key" width={16} />
                      <span className="font-mono text-xs">
                        {account.admin_api_key_prefix}****
                      </span>
                    </div>
                  )}
                  {account.organization_id && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Icon icon="mdi:office-building" width={16} />
                      <span className="text-xs">{account.organization_id}</span>
                    </div>
                  )}
                  {account.total_balance != null && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Icon icon={account.platform === 'volcengine' ? 'mdi:currency-cny' : 'mdi:currency-usd'} width={16} />
                      <span className="text-xs">{t('platformAccounts.balance')}: {account.platform === 'volcengine' ? '¥' : '$'}{account.total_balance!.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 添加账号模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingAccount ? t('platformAccounts.editAccountModal') : t('platformAccounts.addAccountModal')}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAccount(null);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Icon icon="mdi:close" width={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <Icon icon="mdi:alert-circle" width={18} />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <Icon icon="mdi:check-circle" width={18} />
                  {success}
                </div>
              )}

              {/* 平台选择（编辑模式下禁用） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('platformAccounts.platform')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(PLATFORMS) as PlatformType[]).map((platform) => {
                    const config = PLATFORMS[platform];
                    const isDisabled = editingAccount !== null;
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => !isDisabled && setForm({ ...form, platform })}
                        disabled={isDisabled}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          form.platform === platform
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center mx-auto mb-2`}>
                          <Icon icon={config.icon} width={20} />
                        </div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {t(`platformAccounts.${platform}`)}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {editingAccount && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {t('platformAccounts.platformCannotChange')}
                  </p>
                )}
              </div>

              {/* 账号名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('platformAccounts.accountName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('platformAccounts.accountNamePlaceholder')}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Admin API Key */}
              {form.platform === 'volcengine' ? (
                // 火山引擎：分别输入 AK 和 SK
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      AccessKeyId (AK) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={form.access_key_id || ''}
                      onChange={(e) => setForm({ ...form, access_key_id: e.target.value })}
                      placeholder="请输入 AccessKeyId"
                      className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      SecretAccessKey (SK) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={form.secret_access_key || ''}
                        onChange={(e) => setForm({ ...form, secret_access_key: e.target.value })}
                        placeholder="请输入 SecretAccessKey"
                        className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Icon icon={showApiKey ? 'mdi:eye-off' : 'mdi:eye'} width={18} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      火山引擎 Admin Key 格式：AccessKeyId:SecretAccessKey
                    </p>
                  </div>
                </>
              ) : (
                // 其他平台：统一输入框
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('platformAccounts.adminApiKey')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={form.admin_api_key}
                      onChange={(e) => setForm({ ...form, admin_api_key: e.target.value })}
                      placeholder={editingAccount ? t('platformAccounts.adminApiKeyPlaceholderEdit') : t('platformAccounts.adminApiKeyPlaceholder', { platform: platformConfig.name })}
                      className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      required={!editingAccount}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Icon icon={showApiKey ? 'mdi:eye-off' : 'mdi:eye'} width={18} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {editingAccount ? t('platformAccounts.adminApiKeyHintEdit') : t('platformAccounts.adminApiKeyHint')}
                  </p>
                </div>
              )}

              {/* Project ID (仅 OpenAI) */}
              {(platformConfig.requiredFields as readonly string[]).includes('project_id') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('platformAccounts.projectId')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.project_id}
                    onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                    placeholder={t('platformAccounts.projectIdPlaceholder')}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('platformAccounts.projectIdHint')}
                  </p>
                </div>
              )}

              {/* Organization ID (可选) */}
              {(platformConfig.optionalFields as readonly string[]).includes('organization_id') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('platformAccounts.organizationId')} <span className="text-gray-400 text-xs">({t('platformAccounts.organizationIdOptional')})</span>
                  </label>
                  <input
                    type="text"
                    value={form.organization_id}
                    onChange={(e) => setForm({ ...form, organization_id: e.target.value })}
                    placeholder={t('platformAccounts.organizationIdPlaceholder')}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Icon icon="mdi:loading" width={18} className="animate-spin" />
                      {t('platformAccounts.configuring')}
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:check" width={18} />
                      {editingAccount ? t('common.save') : t('platformAccounts.saveAndVerify')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * 法律条款页面 - 隐私政策和服务条款
 * 现代专业设计
 */

import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

export default function Legal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { type } = useParams<{ type: 'privacy' | 'terms' }>();

  const isPrivacy = type === 'privacy';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-950 dark:via-slate-950 dark:to-gray-950">
      {/* 装饰背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航 */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
            >
              <Icon icon="mdi:arrow-left" width={18} />
              <span className="text-sm font-medium">{t('common.back')}</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Icon icon="mdi:chart-timeline-variant" width={18} className="text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Costix
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* 内容区域 */}
      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 文档类型切换 */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => navigate('/legal/privacy')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isPrivacy 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon icon="mdi:shield-lock-outline" width={18} />
              Privacy Policy
            </button>
            <button
              onClick={() => navigate('/legal/terms')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                !isPrivacy 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Icon icon="mdi:file-document-outline" width={18} />
              Terms of Service
            </button>
          </div>
        </div>

        {/* 主内容卡片 */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-200/50 dark:border-gray-800 overflow-hidden">
          {/* 标题区域 */}
          <div className="relative px-8 md:px-12 pt-10 pb-8 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100/50 to-transparent dark:from-blue-900/20 rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                  isPrivacy 
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/25' 
                    : 'bg-gradient-to-br from-violet-400 to-purple-500 shadow-violet-500/25'
                }`}>
                  <Icon 
                    icon={isPrivacy ? 'mdi:shield-lock' : 'mdi:file-document-check'} 
                    width={24} 
                    className="text-white" 
                  />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Last updated: February 2026
                  </p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm max-w-2xl">
                {isPrivacy 
                  ? 'We care about your privacy. This policy describes how we collect, use, and protect your personal information.'
                  : 'Please read these terms carefully before using Costix. By using our service, you agree to these terms.'}
              </p>
            </div>
          </div>

          {/* 文档内容 */}
          <div className="px-8 md:px-12 py-10">
            {isPrivacy ? (
              <div className="space-y-8">
                <Section 
                  number="1" 
                  title="Information We Collect" 
                  icon="mdi:database-outline"
                >
                  <p>We collect information you provide directly to us, including:</p>
                  <CheckList items={[
                    'Account information (name, email address)',
                    'API keys and platform credentials you configure',
                    'Usage data and analytics',
                    'Communication preferences'
                  ]} />
                </Section>

                <Section 
                  number="2" 
                  title="How We Use Your Information" 
                  icon="mdi:cog-outline"
                >
                  <p>We use the information we collect to:</p>
                  <CheckList items={[
                    'Provide, maintain, and improve our services',
                    'Send you technical notices and support messages',
                    'Monitor and analyze usage patterns',
                    'Detect and prevent fraud and abuse'
                  ]} />
                </Section>

                <Section 
                  number="3" 
                  title="Data Security" 
                  icon="mdi:shield-check-outline"
                >
                  <p>We implement industry-standard security measures to protect your data:</p>
                  <CheckList items={[
                    'All API keys are encrypted at rest using AES-256',
                    'Data is transmitted over HTTPS/TLS 1.3',
                    'Row-level security (RLS) for complete data isolation',
                    'Regular security audits and penetration testing'
                  ]} color="emerald" />
                </Section>

                <Section 
                  number="4" 
                  title="Data Retention" 
                  icon="mdi:clock-outline"
                >
                  <p>
                    We retain your data for as long as your account is active. You can request 
                    deletion of your data at any time by contacting us. Upon account deletion, 
                    your data will be permanently removed within 30 days.
                  </p>
                </Section>

                <Section 
                  number="5" 
                  title="Third-Party Services" 
                  icon="mdi:link-variant"
                >
                  <p>We may share data with trusted third-party services:</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ServiceBadge name="Supabase" desc="Database & Auth" icon="simple-icons:supabase" />
                    <ServiceBadge name="Vercel" desc="Hosting" icon="simple-icons:vercel" />
                    <ServiceBadge name="PayPal" desc="Payments" icon="simple-icons:paypal" />
                  </div>
                </Section>

                <Section 
                  number="6" 
                  title="Your Rights" 
                  icon="mdi:account-check-outline"
                >
                  <p>You have the right to:</p>
                  <CheckList items={[
                    'Access your personal data',
                    'Correct inaccurate data',
                    'Request deletion of your data',
                    'Export your data in portable format',
                    'Opt out of marketing communications'
                  ]} color="blue" />
                </Section>

                <Section 
                  number="7" 
                  title="Cookies" 
                  icon="mdi:cookie-outline"
                >
                  <p>
                    We use essential cookies for authentication and session management only. 
                    We do not use tracking cookies or third-party analytics without your explicit consent.
                  </p>
                </Section>

                <Section 
                  number="8" 
                  title="Changes to This Policy" 
                  icon="mdi:update"
                >
                  <p>
                    We may update this privacy policy from time to time. We will notify you 
                    of any material changes by email or through a prominent notice on our website 
                    at least 14 days before the changes take effect.
                  </p>
                </Section>

                <Section 
                  number="9" 
                  title="Contact Us" 
                  icon="mdi:email-outline"
                  isLast
                >
                  <p>If you have any questions about this Privacy Policy, please contact us:</p>
                  <ContactCard email="privacy@costix.net" />
                </Section>
              </div>
            ) : (
              <div className="space-y-8">
                <Section 
                  number="1" 
                  title="Acceptance of Terms" 
                  icon="mdi:check-decagram-outline"
                >
                  <p>
                    By accessing or using Costix, you agree to be bound by these Terms of Service 
                    and all applicable laws and regulations. If you do not agree to these terms, 
                    please do not use our service.
                  </p>
                </Section>

                <Section 
                  number="2" 
                  title="Description of Service" 
                  icon="mdi:view-dashboard-outline"
                >
                  <p>Costix is an API key management platform that allows you to:</p>
                  <CheckList items={[
                    'Manage API keys from multiple AI platforms in one place',
                    'Monitor usage, costs, and performance in real-time',
                    'Collaborate securely with team members',
                    'Receive intelligent alerts and notifications'
                  ]} />
                </Section>

                <Section 
                  number="3" 
                  title="User Accounts" 
                  icon="mdi:account-outline"
                >
                  <p>You are responsible for:</p>
                  <CheckList items={[
                    'Maintaining the confidentiality of your account credentials',
                    'All activities that occur under your account',
                    'Notifying us immediately of any unauthorized access',
                    'Providing accurate and up-to-date information'
                  ]} color="amber" />
                </Section>

                <Section 
                  number="4" 
                  title="Acceptable Use" 
                  icon="mdi:shield-alert-outline"
                >
                  <p>You agree not to:</p>
                  <CheckList items={[
                    'Violate any applicable laws or regulations',
                    'Infringe on intellectual property rights',
                    'Transmit malware, viruses, or harmful code',
                    'Attempt to gain unauthorized access to our systems',
                    'Interfere with or disrupt the service operation'
                  ]} color="red" icon="mdi:close-circle" />
                </Section>

                <Section 
                  number="5" 
                  title="Subscription and Payments" 
                  icon="mdi:credit-card-outline"
                >
                  <div className="space-y-3">
                    <p>Regarding paid plans:</p>
                    <CheckList items={[
                      'Paid plans are billed in advance (monthly or annual)',
                      'Full refunds available within 30 days of purchase',
                      'Pricing changes announced 30 days in advance',
                      'Subscriptions auto-renew unless cancelled'
                    ]} color="blue" />
                  </div>
                </Section>

                <Section 
                  number="6" 
                  title="API Keys and Security" 
                  icon="mdi:key-outline"
                >
                  <p>
                    You are solely responsible for the API keys you store in Costix. 
                    While we implement bank-level encryption and security measures, you should:
                  </p>
                  <CheckList items={[
                    'Rotate keys regularly according to best practices',
                    'Never share your Costix account credentials',
                    'Monitor your key usage for anomalies',
                    'Report any suspicious activity immediately'
                  ]} color="emerald" />
                </Section>

                <Section 
                  number="7" 
                  title="Limitation of Liability" 
                  icon="mdi:scale-balance"
                >
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <p className="text-amber-800 dark:text-amber-200 text-sm">
                      <strong>Important:</strong> Costix is provided "as is" without warranties of any kind. 
                      We are not liable for any indirect, incidental, or consequential damages. 
                      Our total liability is limited to the amount you paid in the last 12 months.
                    </p>
                  </div>
                </Section>

                <Section 
                  number="8" 
                  title="Termination" 
                  icon="mdi:account-remove-outline"
                >
                  <CheckList items={[
                    'We may suspend accounts for terms violations',
                    'You may cancel your account at any time',
                    'Data deletion occurs within 30 days of termination',
                    'Paid subscription fees are non-refundable after 30 days'
                  ]} color="gray" />
                </Section>

                <Section 
                  number="9" 
                  title="Modifications" 
                  icon="mdi:file-edit-outline"
                >
                  <p>
                    We may modify these terms at any time. Material changes will be announced 
                    via email and our website at least 14 days in advance. Continued use of the 
                    service after modifications constitutes acceptance of the new terms.
                  </p>
                </Section>

                <Section 
                  number="10" 
                  title="Governing Law" 
                  icon="mdi:gavel"
                >
                  <p>
                    These terms are governed by the laws of the State of Delaware, United States. 
                    Any disputes shall be resolved through binding arbitration in accordance with 
                    the rules of the American Arbitration Association.
                  </p>
                </Section>

                <Section 
                  number="11" 
                  title="Contact" 
                  icon="mdi:email-outline"
                  isLast
                >
                  <p>For questions about these Terms of Service, contact us:</p>
                  <ContactCard email="legal@costix.net" />
                </Section>
              </div>
            )}
          </div>
        </div>

        {/* 底部导航 */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all text-sm font-medium flex items-center gap-2"
          >
            <Icon icon="mdi:home" width={18} />
            Back to Home
          </button>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="relative py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-200/50 dark:border-gray-800/50 mt-12">
        <div className="max-w-5xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; 2026 Costix. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

// 章节组件
function Section({ 
  number, 
  title, 
  icon, 
  children, 
  isLast = false 
}: { 
  number: string; 
  title: string; 
  icon: string; 
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className={`relative ${!isLast ? 'pb-8 border-b border-gray-100 dark:border-gray-800' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
          <Icon icon={icon} width={20} className="text-gray-600 dark:text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="text-blue-500 dark:text-blue-400 text-sm font-mono">{number}.</span>
            {title}
          </h2>
          <div className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed space-y-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// 复选列表组件
function CheckList({ 
  items, 
  color = 'green',
  icon = 'mdi:check-circle'
}: { 
  items: string[]; 
  color?: 'green' | 'blue' | 'emerald' | 'amber' | 'red' | 'gray';
  icon?: string;
}) {
  const colorClasses = {
    green: 'text-green-500',
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    red: 'text-red-400',
    gray: 'text-gray-400'
  };

  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2.5">
          <Icon icon={icon} width={18} className={`${colorClasses[color]} mt-0.5 flex-shrink-0`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// 服务徽章组件
function ServiceBadge({ name, desc, icon }: { name: string; desc: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
      <Icon icon={icon} width={24} className="text-gray-600 dark:text-gray-400" />
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">{name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{desc}</div>
      </div>
    </div>
  );
}

// 联系卡片组件
function ContactCard({ email }: { email: string }) {
  return (
    <a 
      href={`mailto:${email}`}
      className="mt-4 inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon icon="mdi:email-fast" width={20} className="text-white" />
      </div>
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Email us at</div>
        <div className="text-sm font-medium text-blue-600 dark:text-blue-400">{email}</div>
      </div>
      <Icon icon="mdi:arrow-right" width={18} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
    </a>
  );
}

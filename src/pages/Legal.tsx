/**
 * 法律条款页面 - 隐私政策和服务条款
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 顶部导航 */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Icon icon="mdi:arrow-left" width={20} />
              <span>{t('common.back')}</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                <Icon icon="mdi:chart-timeline-variant" width={20} className="text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                KeyPilot
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* 内容区域 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 md:p-12">
          {isPrivacy ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Privacy Policy
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                Last updated: February 2026
              </p>

              <div className="prose dark:prose-invert max-w-none">
                <h2>1. Information We Collect</h2>
                <p>
                  We collect information you provide directly to us, including:
                </p>
                <ul>
                  <li>Account information (name, email address)</li>
                  <li>API keys and platform credentials you configure</li>
                  <li>Usage data and analytics</li>
                  <li>Communication preferences</li>
                </ul>

                <h2>2. How We Use Your Information</h2>
                <p>
                  We use the information we collect to:
                </p>
                <ul>
                  <li>Provide, maintain, and improve our services</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Monitor and analyze usage patterns</li>
                  <li>Detect and prevent fraud and abuse</li>
                </ul>

                <h2>3. Data Security</h2>
                <p>
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul>
                  <li>All API keys are encrypted at rest</li>
                  <li>Data is transmitted over HTTPS/TLS</li>
                  <li>We use row-level security (RLS) for data isolation</li>
                  <li>Regular security audits and penetration testing</li>
                </ul>

                <h2>4. Data Retention</h2>
                <p>
                  We retain your data for as long as your account is active. You can request
                  deletion of your data at any time by contacting us.
                </p>

                <h2>5. Third-Party Services</h2>
                <p>
                  We may share data with third-party services:
                </p>
                <ul>
                  <li>Supabase (database and authentication)</li>
                  <li>Vercel (hosting and deployment)</li>
                  <li>PayPal (payment processing)</li>
                </ul>

                <h2>6. Your Rights</h2>
                <p>
                  You have the right to:
                </p>
                <ul>
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Export your data</li>
                  <li>Opt out of marketing communications</li>
                </ul>

                <h2>7. Cookies</h2>
                <p>
                  We use essential cookies for authentication and session management.
                  We do not use tracking cookies without your consent.
                </p>

                <h2>8. Changes to This Policy</h2>
                <p>
                  We may update this privacy policy from time to time. We will notify you
                  of any changes by posting the new policy on this page.
                </p>

                <h2>9. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <ul>
                  <li>Email: privacy@keypilot.dev</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Terms of Service
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                Last updated: February 2026
              </p>

              <div className="prose dark:prose-invert max-w-none">
                <h2>1. Acceptance of Terms</h2>
                <p>
                  By accessing or using KeyPilot, you agree to be bound by these Terms of Service.
                  If you do not agree to these terms, please do not use our service.
                </p>

                <h2>2. Description of Service</h2>
                <p>
                  KeyPilot is an API key management platform that allows you to:
                </p>
                <ul>
                  <li>Manage API keys from multiple AI platforms</li>
                  <li>Monitor usage and costs</li>
                  <li>Collaborate with team members</li>
                  <li>Receive alerts and notifications</li>
                </ul>

                <h2>3. User Accounts</h2>
                <p>
                  You are responsible for:
                </p>
                <ul>
                  <li>Maintaining the confidentiality of your account</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us of any unauthorized access</li>
                </ul>

                <h2>4. Acceptable Use</h2>
                <p>
                  You agree not to:
                </p>
                <ul>
                  <li>Violate any laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Transmit malware or harmful code</li>
                  <li>Attempt to gain unauthorized access</li>
                  <li>Interfere with the service's operation</li>
                </ul>

                <h2>5. Subscription and Payments</h2>
                <p>
                  Paid plans are billed in advance on a monthly or annual basis.
                  Refunds are available within 30 days of initial purchase.
                  We reserve the right to change pricing with 30 days notice.
                </p>

                <h2>6. API Keys and Security</h2>
                <p>
                  You are solely responsible for the API keys you store in KeyPilot.
                  We encrypt all keys but cannot guarantee absolute security.
                  You should rotate keys regularly and follow security best practices.
                </p>

                <h2>7. Limitation of Liability</h2>
                <p>
                  KeyPilot is provided "as is" without warranties of any kind.
                  We are not liable for any indirect, incidental, or consequential damages.
                  Our total liability is limited to the amount you paid in the last 12 months.
                </p>

                <h2>8. Termination</h2>
                <p>
                  We may suspend or terminate your account for violation of these terms.
                  You may cancel your account at any time.
                  Upon termination, your data may be deleted after a grace period.
                </p>

                <h2>9. Modifications</h2>
                <p>
                  We may modify these terms at any time. Continued use of the service
                  after modifications constitutes acceptance of the new terms.
                </p>

                <h2>10. Governing Law</h2>
                <p>
                  These terms are governed by the laws of the United States.
                  Any disputes shall be resolved in the courts of Delaware.
                </p>

                <h2>11. Contact</h2>
                <p>
                  For questions about these Terms, contact us at:
                </p>
                <ul>
                  <li>Email: legal@keypilot.dev</li>
                </ul>
              </div>
            </>
          )}

          {/* 导航按钮 */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={() => navigate(isPrivacy ? '/legal/terms' : '/legal/privacy')}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Icon icon={isPrivacy ? 'mdi:file-document-outline' : 'mdi:shield-lock-outline'} width={18} />
              {isPrivacy ? 'Terms of Service' : 'Privacy Policy'}
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; 2026 KeyPilot. All rights reserved.
        </div>
      </footer>
    </div>
  );
}


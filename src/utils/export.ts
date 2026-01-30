/**
 * 数据导出工具函数
 * 支持导出 CSV 和 Excel 格式
 */

interface ExportColumn {
  key: string;
  title: string;
  formatter?: (value: any, row: any) => string;
}

/**
 * 导出数据为 CSV 格式
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  // 构建 CSV 内容
  const headers = columns.map(col => `"${col.title}"`).join(',');
  
  const rows = data.map(row => {
    return columns.map(col => {
      let value = row[col.key];
      if (col.formatter) {
        value = col.formatter(value, row);
      }
      // 处理空值
      if (value === null || value === undefined) {
        value = '';
      }
      // 转换为字符串并处理特殊字符
      const strValue = String(value).replace(/"/g, '""');
      return `"${strValue}"`;
    }).join(',');
  });

  const csvContent = [headers, ...rows].join('\n');
  
  // 添加 BOM 以支持中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * 导出数据为 Excel 格式（使用简单的 XML 格式）
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Sheet1'
): void {
  // 构建 XML 格式的 Excel 文件
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#E0E0E0" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${sheetName}">
    <Table>`;

  // 表头
  xml += '\n      <Row>';
  columns.forEach(col => {
    xml += `\n        <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col.title)}</Data></Cell>`;
  });
  xml += '\n      </Row>';

  // 数据行
  data.forEach(row => {
    xml += '\n      <Row>';
    columns.forEach(col => {
      let value = row[col.key];
      if (col.formatter) {
        value = col.formatter(value, row);
      }
      if (value === null || value === undefined) {
        value = '';
      }
      const type = typeof value === 'number' ? 'Number' : 'String';
      xml += `\n        <Cell><Data ss:Type="${type}">${escapeXml(String(value))}</Data></Cell>`;
    });
    xml += '\n      </Row>';
  });

  xml += `
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, `${filename}.xls`);
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 下载 Blob 文件
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * API Keys 导出列定义
 */
export const API_KEYS_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'name', title: '名称' },
  { key: 'platform', title: '平台' },
  { key: 'maskedKey', title: 'API Key' },
  { key: 'status', title: '状态', formatter: (value) => {
    const statusMap: Record<string, string> = {
      active: '正常',
      inactive: '未激活',
      low_balance: '余额不足',
      expired: '已过期',
    };
    return statusMap[value] || value;
  }},
  { key: 'balance', title: '余额', formatter: (value, row) => {
    if (value === null || value === undefined) return '-';
    return row.platform === 'volcengine' ? `¥${value.toFixed(2)}` : `$${value.toFixed(2)}`;
  }},
  { key: 'monthlyUsage', title: '本月消费', formatter: (value, row) => {
    if (value === null || value === undefined) return '$0.00';
    return row.platform === 'volcengine' ? `¥${value.toFixed(2)}` : `$${value.toFixed(2)}`;
  }},
  { key: 'tokenUsage', title: '本月 Tokens', formatter: (value) => {
    if (!value || !value.monthly) return '0';
    const num = value.monthly;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  }},
  { key: 'ownerName', title: '责任人' },
  { key: 'ownerPhone', title: '联系电话' },
  { key: 'ownerEmail', title: '邮箱' },
  { key: 'business', title: '业务用途' },
  { key: 'expiresAt', title: '过期时间', formatter: (value) => {
    if (!value) return '永久有效';
    return new Date(value).toLocaleDateString('zh-CN');
  }},
  { key: 'createdAt', title: '创建时间', formatter: (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('zh-CN');
  }},
];


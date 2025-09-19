'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Table, 
  Button, 
  Space, 
  message, 
  Popconfirm,
  Typography,
  Image,
  Input,
  Rate,
  Tag,
  Card,
  Row,
  Col,
  Avatar,
  Statistic,
  Badge
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  ShopOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  StarOutlined
} from '@ant-design/icons';
import { ProtectedRoute, AdminLayout } from '@components';
import { 
  useGetAllBoutiquesQuery,
  useDeleteBoutiqueMutation,
  GetAllBoutiquesQuery
} from '@generated/graphql';
import { FILE_CONFIG } from '@lib/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Search } = Input;
const { Title, Text } = Typography;

// 全局样式
const globalStyles = `
.boutiques-container {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  padding: 24px;
}

.boutiques-stats-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e8e8e8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

.boutiques-table-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e8e8e8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.boutiques-table-card .ant-table {
  border-radius: 16px;
}

.boutiques-table-card .ant-table-thead > tr > th {
  background: #fafafa;
  border-bottom: 2px solid #f0f0f0;
  font-weight: 600;
  color: #262626;
  padding: 16px 12px;
}

.boutiques-table-card .ant-table-tbody > tr > td {
  padding: 16px 12px;
  border-bottom: 1px solid #f5f5f5;
}

.boutiques-table-card .ant-table-tbody > tr:hover > td {
  background: #f8f9ff;
}

.boutique-image-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 20%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
}

.boutique-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.boutique-name-info h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
  line-height: 1.4;
}

.boutique-name-info p {
  margin: 0;
  font-size: 13px;
  color: #8c8c8c;
  line-height: 1.2;
}

.boutique-status-tag {
  border-radius: 16px;
  font-weight: 500;
  border: none;
}

.boutique-rating {
  display: flex;
  align-items: center;
  gap: 6px;
}

.boutique-actions {
  display: flex;
  gap: 8px;
}

.boutique-edit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  border-radius: 8px;
  font-weight: 500;
}

.boutique-delete-btn {
  border: 1px solid #ff4d4f;
  color: #ff4d4f;
  border-radius: 8px;
  font-weight: 500;
}

.search-filter-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.search-filter-section .ant-btn-primary {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-filter-section .ant-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.add-boutique-btn {
  white-space: nowrap;
  min-width: 110px;
}

@media (max-width: 576px) {
  .add-boutique-btn {
    width: 100%;
    margin-top: 8px;
  }
}

.stats-item {
  text-align: center;
  padding: 16px;
}

.stats-number {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.stats-label {
  color: #8c8c8c;
  font-size: 14px;
  margin-top: 4px;
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = globalStyles;
  if (!document.head.querySelector('style[data-boutiques]')) {
    styleElement.setAttribute('data-boutiques', 'true');
    document.head.appendChild(styleElement);
  }
}

// 使用生成的类型
type Boutique = GetAllBoutiquesQuery['boutiques'][0];

// 店铺状态映射
const getBoutiqueStatusInfo = (status: string) => {
  const statusMap = {
    'open': {
      text: '已开放',
      color: '#52C41A',
      bgColor: '#F6FFED',
      icon: <CheckCircleOutlined />
    },
    'closed': {
      text: '已关闭',
      color: '#8C8C8C',
      bgColor: '#F5F5F5',
      icon: <EyeInvisibleOutlined />
    },
    'pending': {
      text: '待审核',
      color: '#FA8C16',
      bgColor: '#FFF7E6',
      icon: <ClockCircleOutlined />
    },
    'draft': {
      text: '草稿',
      color: '#722ED1',
      bgColor: '#F9F0FF',
      icon: <FileTextOutlined />
    }
  };
  return statusMap[status as keyof typeof statusMap] || statusMap['open'];
};

function BoutiquesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const containerRef = useRef<HTMLDivElement>(null);

  // 查询店铺列表（超级管理员权限 - 查看所有店铺）
  const { data: boutiquesData, loading, error, refetch } = useGetAllBoutiquesQuery();
  
  // 从 URL 参数恢复状态
  useEffect(() => {
    const page = searchParams.get('page');
    const size = searchParams.get('pageSize');
    const search = searchParams.get('search');
    const scrollPos = searchParams.get('scrollPos');

    if (page) setCurrentPage(parseInt(page));
    if (size) setPageSize(parseInt(size));
    if (search) setSearchText(search);

    // 恢复滚动位置
    if (scrollPos && containerRef.current) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(scrollPos));
      }, 100);
    }
  }, [searchParams]);

  // 删除店铺
  const [deleteBoutique] = useDeleteBoutiqueMutation({
    onCompleted: () => {
      message.success('店铺删除成功');
      refetch();
    },
    onError: (error) => {
      console.error('删除店铺失败:', error);
      message.error('删除店铺失败');
    }
  });

  const boutiques = boutiquesData?.boutiques || [];

  // 调试: 检查店铺数据结构 (可在生产环境中移除)
  if (process.env.NODE_ENV === 'development') {
    console.log('Boutiques data:', boutiques);
    if (boutiques.length > 0) {
      console.log('First boutique images:', boutiques[0].images);
      console.log('First boutique main_image:', boutiques[0].main_image);
    }
  }

  // 处理错误
  if (error) {
    message.error('获取店铺列表失败');
  }

  // 删除店铺
  const handleDeleteBoutique = async (id: string) => {
    try {
      await deleteBoutique({
        variables: { id }
      });
    } catch (error) {
      console.error('删除店铺失败:', error);
    }
  };

  // 编辑店铺
  const handleEditBoutique = (id: string) => {
    // 保存当前状态到 URL 参数
    const currentScrollPos = window.scrollY;
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('pageSize', pageSize.toString());
    params.set('search', searchText);
    params.set('scrollPos', currentScrollPos.toString());
    
    router.push(`/boutiques/${id}?return=${encodeURIComponent(params.toString())}`);
  };

  // 新增店铺
  const handleAddBoutique = () => {
    // 保存当前状态到 URL 参数，用于新增完成后返回
    const currentScrollPos = window.scrollY;
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('pageSize', pageSize.toString());
    params.set('search', searchText);
    params.set('scrollPos', currentScrollPos.toString());
    
    router.push(`/boutiques/new?return=${encodeURIComponent(params.toString())}`);
  };

  // 过滤店铺
  const filteredBoutiques = boutiques.filter((boutique: Boutique) =>
    boutique.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    boutique.address?.toLowerCase().includes(searchText.toLowerCase())
  );

  // 生成带认证的图片URL - 为店铺列表页面优化尺寸
  const getImageUrl = useCallback((imageId: string): string => {
    return FILE_CONFIG.getAssetUrl(imageId, undefined, {
      width: 120,
      height: 120,
      quality: 80,
      fit: 'cover',
      format: 'webp'
    });
  }, []);

  // 解析图片字段，处理 JSON 字符串或数组
  const parseImages = useCallback((images: any): string[] => {
    if (!images) return [];
    
    try {
      // 如果是字符串，尝试解析为JSON
      if (typeof images === 'string') {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [];
      }
      // 如果已经是数组，直接返回
      if (Array.isArray(images)) {
        return images;
      }
      return [];
    } catch (error) {
      console.warn('解析图片数据失败:', error, images);
      return [];
    }
  }, []);

  // 表格列定义
  const columns = [
    {
      title: '店铺信息',
      key: 'info',
      width: 300,
      render: (_: any, record: Boutique) => {
        const mainImage = record.main_image;
        
        return (
          <div className="boutique-name-cell">
            <div className="boutique-image-wrapper">
              {mainImage ? (
                <Image
                  src={getImageUrl(mainImage)}
                  alt="店铺图片"
                  width={64}
                  height={64}
                  style={{ objectFit: 'cover' }}
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dy"
                  onError={(e) => {
                    if (process.env.NODE_ENV === 'development') {
                      console.error('图片加载失败:', mainImage, getImageUrl(mainImage), e);
                    }
                  }}
                />
              ) : (
                <ShopOutlined style={{ color: 'white', fontSize: '24px' }} />
              )}
            </div>
            
            <div className="boutique-name-info">
              <h4>{record.name || '未命名店铺'}</h4>
              <p>{record.code ? `店铺代码: ${record.code}` : '暂无代码'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <Tag style={{ margin: 0, borderRadius: '12px', fontSize: '12px' }}>
                  {record.category || '未分类'}
                </Tag>
                {record.city && (
                  <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    {record.city}
                  </Text>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: '评分',
      dataIndex: 'stars',
      key: 'stars',
      width: 150,
      render: (stars: number) => (
        <div className="boutique-rating">
          <Rate disabled value={stars || 0} style={{ fontSize: '16px' }} />
          <Text style={{ fontSize: '13px', color: '#8c8c8c', marginLeft: '8px' }}>
            {stars ? stars.toFixed(1) : '0.0'}
          </Text>
        </div>
      ),
      sorter: (a: Boutique, b: Boutique) => (a.stars || 0) - (b.stars || 0),
    },
    {
      title: '地址信息',
      key: 'address',
      width: 250,
      render: (_: any, record: Boutique) => (
        <div>
          <div style={{ 
            fontWeight: 500, 
            color: '#262626',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '220px'
          }}
          title={record.address ? record.address : undefined}
          >
            {record.address || '地址未填写'}
          </div>
          <div style={{ fontSize: '13px', color: '#8c8c8c' }}>
            {record.contact || '联系方式未填写'}
          </div>
        </div>
      ),
      sorter: (a: Boutique, b: Boutique) => (a.address || '').localeCompare(b.address || ''),
    },
    {
      title: '过期时间',
      dataIndex: 'expire_date',
      key: 'expire_date',
      width: 150,
      render: (date: string) => {
        if (!date) return <Text style={{ color: '#8c8c8c' }}>未设置</Text>;
        
        const expireDate = dayjs(date);
        const isExpired = expireDate.isBefore(dayjs());
        const isExpiringSoon = expireDate.isBefore(dayjs().add(30, 'day'));
        
        return (
          <div>
            <div style={{ 
              fontWeight: 500,
              color: isExpired ? '#ff4d4f' : isExpiringSoon ? '#fa8c16' : '#262626'
            }}>
              {expireDate.format('YYYY-MM-DD')}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: isExpired ? '#ff4d4f' : isExpiringSoon ? '#fa8c16' : '#8c8c8c'
            }}>
              {isExpired ? '已过期' : expireDate.fromNow()}
            </div>
          </div>
        );
      },
      sorter: (a: Boutique, b: Boutique) => {
        const dateA = a.expire_date ? new Date(a.expire_date).getTime() : 0;
        const dateB = b.expire_date ? new Date(b.expire_date).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusInfo = getBoutiqueStatusInfo(status);
        return (
          <Tag 
            className="boutique-status-tag"
            style={{ 
              background: statusInfo.bgColor,
              color: statusInfo.color,
              border: `1px solid ${statusInfo.color}20`
            }}
            icon={statusInfo.icon}
          >
            {statusInfo.text}
          </Tag>
        );
      },
      filters: [
        { text: '已开放', value: 'open' },
        { text: '已关闭', value: 'closed' },
        { text: '待审核', value: 'pending' },
        { text: '草稿', value: 'draft' },
      ],
      onFilter: (value: any, record: Boutique) => record.status === value,
    },
    {
      title: '创建时间',
      dataIndex: 'date_created',
      key: 'date_created',
      width: 150,
      render: (date: string) => {
        if (!date) return <Text style={{ color: '#8c8c8c' }}>-</Text>;
        
        return (
          <div>
            <div style={{ fontWeight: 500, color: '#262626' }}>
              {dayjs(date).format('MM-DD')}
            </div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {dayjs(date).fromNow()}
            </div>
          </div>
        );
      },
      sorter: (a: Boutique, b: Boutique) => {
        const dateA = a.date_created ? new Date(a.date_created).getTime() : 0;
        const dateB = b.date_created ? new Date(b.date_created).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: Boutique) => (
        <div className="boutique-actions">
          <Button
            className="boutique-edit-btn"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditBoutique(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个店铺吗?"
            description="删除后将无法恢复，请谨慎操作。"
            onConfirm={() => handleDeleteBoutique(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button 
              className="boutique-delete-btn"
              size="small" 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="boutiques-container">
      {/* 统计卡片 */}
      <Card className="boutiques-stats-card">
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={6}>
            <div className="stats-item">
              <div className="stats-number">
                {filteredBoutiques.length}
              </div>
              <div className="stats-label">总店铺数</div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="stats-item">
              <div className="stats-number">
                {filteredBoutiques.filter(b => b.status === 'open').length}
              </div>
              <div className="stats-label">已开放</div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="stats-item">
              <div className="stats-number">
                {filteredBoutiques.filter(b => b.status === 'closed').length}
              </div>
              <div className="stats-label">已关闭</div>
            </div>
          </Col>
          <Col xs={24} sm={6}>
            <div className="stats-item">
              <div className="stats-number">
                {filteredBoutiques.filter(b => {
                  if (!b.expire_date) return false;
                  return dayjs(b.expire_date).isBefore(dayjs().add(30, 'day'));
                }).length}
              </div>
              <div className="stats-label">即将过期</div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 搜索和筛选区域 */}
      <div className="search-filter-section">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={10} lg={8}>
            <Search
              placeholder="搜索店铺名称或地址"
              allowClear
              size="large"
              prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
              onSearch={setSearchText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              style={{ borderRadius: '12px' }}
            />
          </Col>
          <Col xs={12} sm={8} md={8} lg={10}>
            <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
              共找到 {filteredBoutiques.length} 个店铺
            </Text>
          </Col>
          <Col xs={12} sm={4} md={6} lg={6} style={{ textAlign: 'right' }}>
            <Button 
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={handleAddBoutique}
              className="add-boutique-btn"
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                fontWeight: 600,
                borderRadius: '12px',
                height: '40px',
                padding: '0 20px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}
            >
              新增店铺
            </Button>
          </Col>
        </Row>
      </div>

      {/* 表格 */}
      <Card className="boutiques-table-card">
        <Table
          columns={columns}
          dataSource={filteredBoutiques}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => (
              <Text style={{ color: '#8c8c8c' }}>
                共 <Text style={{ color: '#667eea', fontWeight: 600 }}>{total}</Text> 条记录
              </Text>
            ),
            size: 'default',
            position: ['bottomCenter'],
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            },
            itemRender: (current, type, originalElement) => {
              if (type === 'page') {
                return (
                  <div style={{ 
                    borderRadius: '8px',
                    border: current === currentPage ? '1px solid #667eea' : '1px solid #d9d9d9',
                    background: current === currentPage ? '#667eea' : 'white',
                    color: current === currentPage ? 'white' : '#262626',
                    minWidth: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    {current}
                  </div>
                );
              }
              return originalElement;
            }
          }}
          scroll={{ x: 1200 }}
          size="middle"
          rowClassName={(record, index) => 
            index % 2 === 0 ? 'boutiques-table-even-row' : 'boutiques-table-odd-row'
          }
        />
      </Card>
    </div>
  );
}

export default function BoutiquesPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <BoutiquesContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}

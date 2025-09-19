'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Row,
  Col,
  Typography,
  Card,
  message,
  Upload,
  Spin,
  Cascader,
  Rate,
  DatePicker,
  Switch,
  Space,
  Tag,
  Avatar,
  Progress,
  Statistic,
  Tabs,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UploadOutlined,
  LoadingOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  EyeInvisibleOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  StarOutlined,
  PictureOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  EditOutlined,
  UserOutlined
} from '@ant-design/icons';
import { ProtectedRoute } from '@components/auth';
import { AdminLayout } from '@components/layout';
import { 
  useGetBoutiquesQuery,
  useGetAllBoutiquesQuery,
  useCreateBoutiqueMutation,
  useUpdateBoutiqueMutation,
  GetBoutiquesQuery,
  GetAllBoutiquesQuery
} from '@generated/graphql';
import { useGetActiveSystemUsersQuery } from '@generated/system-graphql';
import systemClient from '@lib/api/system-apollo-client';
import { TokenManager } from '@lib/auth';
import { FILE_CONFIG } from '@lib/api';
import { 
  CHINA_PROVINCES, 
  getFullAddressByCityName, 
  parseFullAddress,
  type Province,
  type City
} from '@lib/utils/china-regions';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;
const { Option } = Select;

// 全局样式
const globalStyles = `
.boutique-edit-container {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  padding: 24px;
}

.boutique-edit-header-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  border-radius: 16px;
  margin-bottom: 24px;
}

.boutique-edit-form-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e8e8e8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

.boutique-info-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 16px;
}

.boutique-edit-tabs .ant-tabs-nav {
  margin-bottom: 24px;
  border-bottom: 2px solid #f0f0f0;
  background: white;
  border-radius: 12px 12px 0 0;
  padding: 0 24px;
}

.boutique-edit-tabs .ant-tabs-tab {
  padding: 16px 24px;
  font-weight: 500;
  font-size: 15px;
}

.boutique-edit-tabs .ant-tabs-tab-active {
  color: #667eea;
  border-color: #667eea;
}

.boutique-form .ant-form-item-label > label {
  font-weight: 600;
  color: #262626;
  font-size: 14px;
}

.boutique-upload-card {
  border: 2px dashed #d9d9d9;
  border-radius: 12px;
  background: #fafafa;
  transition: all 0.3s;
}

.boutique-upload-card:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.edit-mode-badge {
  background: linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%);
  color: white;
  border: none;
}

.new-mode-badge {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  color: white;
  border: none;
}

.boutique-stats-item {
  text-align: center;
  padding: 16px 12px;
}

.boutique-stats-number {
  font-size: 24px;
  font-weight: 700;
  color: white;
  line-height: 1.2;
}

.boutique-stats-label {
  color: rgba(255,255,255,0.8);
  font-size: 13px;
  margin-top: 4px;
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = globalStyles;
  if (!document.head.querySelector('style[data-boutique-edit]')) {
    styleElement.setAttribute('data-boutique-edit', 'true');
    document.head.appendChild(styleElement);
  }
}

// 使用生成的类型
type Boutique = GetBoutiquesQuery['boutiques'][0] | GetAllBoutiquesQuery['boutiques'][0];

function BoutiqueEditContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [boutique, setBoutique] = useState<Boutique | null>(null);
  
  // 图片上传相关状态
  const [mainImageList, setMainImageList] = useState<any[]>([]);
  const [imageList, setImageList] = useState<any[]>([]);
  const [mainImageUploading, setMainImageUploading] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);

  // 省市级联选择器数据
  const [cascaderOptions, setCascaderOptions] = useState<any[]>([]);

  const isEditMode = params.id !== 'new';

  // 查询系统用户列表（用于创建者选择），使用系统专用客户端
  const { data: systemUsersData, loading: systemUsersLoading } = useGetActiveSystemUsersQuery({
    client: systemClient
  });
  const systemUsers = systemUsersData?.users || [];

  // 初始化级联选择器数据
  useEffect(() => {
    const options = CHINA_PROVINCES.map(province => ({
      value: province.code,
      label: province.name,
      children: province.cities.map(city => ({
        value: city.code,
        label: city.name
      }))
    }));
    setCascaderOptions(options);
  }, []);

  // 获取当前用户 ID
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const currentUserId = TokenManager.getCurrentUserId();
    setUserId(currentUserId);
  }, []);

  // 查询店铺列表
  const { data: boutiquesData, refetch, loading: boutiquesLoading } = isEditMode 
    ? useGetAllBoutiquesQuery()  // 编辑模式：查询所有店铺
    : useGetBoutiquesQuery({     // 创建模式：按用户权限过滤
        variables: userId ? { userId } : undefined,
        skip: !userId
      });
  
  // 创建店铺
  const [createBoutique] = useCreateBoutiqueMutation({
    onCompleted: () => {
      message.success('店铺创建成功');
      refetch(); // 刷新店铺列表缓存
      const returnParams = searchParams.get('return');
      if (returnParams) {
        const decodedParams = decodeURIComponent(returnParams);
        router.push(`/boutiques?${decodedParams}`);
      } else {
        router.push('/boutiques');
      }
    },
    onError: (error) => {
      console.error('创建店铺失败:', error);
      message.error('创建店铺失败');
      setSaving(false);
    }
  });

  // 更新店铺
  const [updateBoutique] = useUpdateBoutiqueMutation({
    onCompleted: () => {
      message.success('店铺更新成功');
      refetch(); // 刷新店铺列表缓存
      const returnParams = searchParams.get('return');
      if (returnParams) {
        const decodedParams = decodeURIComponent(returnParams);
        router.push(`/boutiques?${decodedParams}`);
      } else {
        router.push('/boutiques');
      }
    },
    onError: (error) => {
      console.error('更新店铺失败:', error);
      message.error('更新店铺失败');
      setSaving(false);
    }
  });

  const boutiques = boutiquesData?.boutiques || [];

  // 生成带认证的图片URL - 使用统一配置
  const getImageUrl = useCallback((imageId: string): string => {
    return FILE_CONFIG.getAssetUrl(imageId);
  }, []);

  // 获取店铺数据
  const fetchBoutique = () => {
    if (!isEditMode || !boutiquesData || boutiquesLoading) return;
    
    const foundBoutique = boutiques.find((b: Boutique) => b.id === params.id);
    if (foundBoutique) {
      setBoutique(foundBoutique);
      
      // 处理省市数据 - 从城市字段解析省市信息
      let cityCascaderValue: string[] = [];
      if (foundBoutique.city) {
        const parsed = parseFullAddress(foundBoutique.city);
        if (parsed.province && parsed.city) {
          cityCascaderValue = [parsed.province.code, parsed.city.code];
        }
      }
      
      // 初始化表单数据
      form.setFieldsValue({
        name: foundBoutique.name,
        address: foundBoutique.address,
        city: cityCascaderValue, // 使用级联选择器格式
        code: foundBoutique.code,
        category: foundBoutique.category,
        contact: foundBoutique.contact,
        expire_date: foundBoutique.expire_date,
        stars: foundBoutique.stars,
        status: foundBoutique.status,
        sort: foundBoutique.sort,
        main_image: foundBoutique.main_image || '',
        images: foundBoutique.images || [],
        user_created: foundBoutique.user_created?.id
      });

      // 初始化主图数据
      if (foundBoutique.main_image) {
        setMainImageList([{
          uid: foundBoutique.main_image,
          name: '主图',
          status: 'done',
          url: getImageUrl(foundBoutique.main_image)
        }]);
      }

      // 初始化店铺图片
      if (foundBoutique.images && Array.isArray(foundBoutique.images)) {
        const imagesList = foundBoutique.images.map((imageId: string, index: number) => ({
          uid: imageId,
          name: `图片${index + 1}`,
          status: 'done',
          url: getImageUrl(imageId)
        }));
        setImageList(imagesList);
      }
    } else if (isEditMode && !boutiquesLoading) {
      // 只有在确认不在加载状态时才显示错误
      message.error('店铺不存在或您没有访问权限');
      router.push('/boutiques');
    }
  };

  // 当数据加载完成时初始化表单
  useEffect(() => {
    fetchBoutique();
  }, [boutiquesData, boutiquesLoading, params.id, isEditMode]);

  // 主图上传处理
  const handleMainImageUpload = useCallback(async (file: File) => {
    setMainImageUploading(true);
    try {
      // 使用TokenManager获取有效令牌
      const authToken = await TokenManager.getValidToken();

      if (!authToken) {
        throw new Error('未找到认证令牌，请重新登录');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const result = await response.json();
      const fileId = result.data.id;

      // 更新表单值
      form.setFieldValue('main_image', fileId);

      // 更新上传列表
      setMainImageList([{
        uid: fileId,
        name: file.name,
        status: 'done',
        url: getImageUrl(fileId)
      }]);

      message.success('主图上传成功');
    } catch (error) {
      console.error('主图上传失败:', error);
      message.error('主图上传失败');
    } finally {
      setMainImageUploading(false);
    }
    return false;
  }, [form, getImageUrl]);

  // 店铺图片上传处理
  const handleImagesUpload = useCallback(async (file: File) => {
    setImagesUploading(true);
    try {
      // 使用TokenManager获取有效令牌
      const authToken = await TokenManager.getValidToken();

      if (!authToken) {
        throw new Error('未找到认证令牌，请重新登录');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const result = await response.json();
      const fileId = result.data.id;

      // 更新图片列表
      const newImageList = [...imageList, {
        uid: fileId,
        name: file.name,
        status: 'done',
        url: getImageUrl(fileId)
      }];
      setImageList(newImageList);

      // 更新表单值
      const imageIds = newImageList.map(img => img.uid);
      form.setFieldValue('images', imageIds);

      message.success('图片上传成功');
    } catch (error) {
      console.error('图片上传失败:', error);
      message.error('图片上传失败');
    } finally {
      setImagesUploading(false);
    }
    return false;
  }, [form, getImageUrl, imageList]);

  // 删除图片处理
  const handleRemoveImage = useCallback((file: any, isMainImage: boolean) => {
    if (isMainImage) {
      setMainImageList([]);
      form.setFieldValue('main_image', '');
    } else {
      const newImageList = imageList.filter(item => item.uid !== file.uid);
      setImageList(newImageList);
      const imageIds = newImageList.map(img => img.uid);
      form.setFieldValue('images', imageIds);
    }
  }, [form, imageList]);

  // 主图变化处理
  const handleMainImageChange = useCallback(({ fileList }: any) => {
    setMainImageList(fileList);
  }, []);

  // 店铺图片变化处理
  const handleImagesChange = useCallback(({ fileList }: any) => {
    setImageList(fileList);
  }, []);

  // 保存店铺
  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      
      // 处理省市级联数据 - 将级联选择的值转换为完整地址
      let cityValue = values.city;
      if (Array.isArray(values.city) && values.city.length === 2) {
        const [provinceCode, cityCode] = values.city;
        const province = CHINA_PROVINCES.find(p => p.code === provinceCode);
        const city = province?.cities.find(c => c.code === cityCode);
        if (province && city) {
          cityValue = `${province.name} ${city.name}`;
        }
      }
      
      const submitData = {
        name: values.name,
        address: values.address,
        city: cityValue,
        code: values.code,
        category: values.category,
        contact: values.contact,
        expire_date: values.expire_date,
        stars: values.stars || 0,
        status: values.status || 'open',
        sort: values.sort || 0,
        main_image: values.main_image || null,
        images: values.images && values.images.length > 0 ? values.images : null,
        ...(values.user_created && isEditMode ? { user_created: values.user_created } : {})
      };

      console.log('Submitting boutique data:', submitData);

      if (isEditMode) {
        await updateBoutique({
          variables: {
            id: params.id as string,
            data: submitData
          }
        });
      } else {
        await createBoutique({
          variables: {
            data: submitData
          }
        });
      }
    } catch (error) {
      console.error('保存店铺失败:', error);
      message.error('保存店铺失败');
    } finally {
      setSaving(false);
    }
  };

  // 返回列表
  const handleBack = () => {
    const returnParams = searchParams.get('return');
    if (returnParams) {
      // 解码返回参数并重建 URL
      const decodedParams = decodeURIComponent(returnParams);
      router.push(`/boutiques?${decodedParams}`);
    } else {
      router.push('/boutiques');
    }
  };

  useEffect(() => {
    fetchBoutique();
  }, [params.id, boutiquesData]);

  if (loading) {
    return (
      <div className="boutique-edit-container">
        <Card className="boutique-edit-form-card">
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px', color: '#8c8c8c' }}>
              正在加载店铺数据...
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 计算店铺完整度
  const calculateBoutiqueCompleteness = () => {
    if (!boutique && !isEditMode) return 0;
    
    const fields = ['name', 'address', 'city', 'category', 'contact'];
    const optionalFields = ['code', 'stars', 'main_image', 'images'];
    
    let completedFields = 0;
    const totalFields = fields.length + optionalFields.length;
    
    // 必填字段
    fields.forEach(field => {
      if (boutique?.[field as keyof typeof boutique] || form.getFieldValue(field)) {
        completedFields++;
      }
    });
    
    // 可选字段
    optionalFields.forEach(field => {
      if (boutique?.[field as keyof typeof boutique] || form.getFieldValue(field)) {
        completedFields++;
      }
    });
    
    return Math.round((completedFields / totalFields) * 100);
  };

  const completeness = calculateBoutiqueCompleteness();

  // 基本信息表单
  const renderBasicForm = () => (
    <Card className="boutique-edit-form-card" style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 600, color: '#262626' }}>
          基本信息
        </Text>
        <div style={{ marginTop: '4px', color: '#8c8c8c', fontSize: '14px' }}>
          配置店铺的基本身份信息
        </div>
      </div>
      
      <Row gutter={[24, 16]}>
        <Col xs={24}>
          <Form.Item
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShopOutlined />
                店铺名称
                <Text type="danger">*</Text>
              </span>
            }
            name="name"
            rules={[{ required: true, message: '请输入店铺名称' }]}
          >
            <Input placeholder="请输入店铺名称" size="large" style={{ borderRadius: '8px' }} />
          </Form.Item>
        </Col>

        <Col xs={24}>
          <Form.Item
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <EnvironmentOutlined />
                店铺地址
              </span>
            }
            name="address"
          >
            <Input placeholder="请输入详细地址" size="large" style={{ borderRadius: '8px' }} />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="所在城市"
            name="city"
            tooltip="选择店铺所在的省份和城市"
          >
            <Cascader
              options={cascaderOptions}
              placeholder="请选择省份和城市"
              size="large"
              style={{ borderRadius: '8px' }}
              showSearch={{
                filter: (inputValue, path) => {
                  return path.some(option => 
                    (option.label as string).toLowerCase().indexOf(inputValue.toLowerCase()) > -1
                  );
                }
              }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="店铺代码"
            name="code"
          >
            <Input placeholder="请输入店铺代码" size="large" style={{ borderRadius: '8px' }} />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="店铺类别"
            name="category"
          >
            <Input placeholder="请输入店铺类别" size="large" style={{ borderRadius: '8px' }} />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PhoneOutlined />
                联系方式
              </span>
            }
            name="contact"
          >
            <Input placeholder="请输入联系电话或邮箱" size="large" style={{ borderRadius: '8px' }} />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="过期时间"
            name="expire_date"
          >
            <Input 
              placeholder="请输入过期时间 (YYYY-MM-DD)"
              size="large"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <StarOutlined />
                店铺评分
              </span>
            }
            name="stars"
          >
            <Rate allowHalf style={{ fontSize: '20px' }} />
          </Form.Item>
        </Col>

        <Col xs={24}>
          <Form.Item
            label="排序权重"
            name="sort"
            tooltip="数值越大排序越靠前"
          >
            <InputNumber 
              placeholder="请输入排序权重" 
              style={{ width: '100%', borderRadius: '8px' }}
              size="large"
              min={0}
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  // 图片管理表单
  const renderImagesForm = () => (
    <Card className="boutique-edit-form-card" style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 600, color: '#262626' }}>
          图片管理
        </Text>
        <div style={{ marginTop: '4px', color: '#8c8c8c', fontSize: '14px' }}>
          上传店铺的展示图片
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Form.Item
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PictureOutlined />
                主图
              </span>
            }
            tooltip="店铺的主要展示图片"
          >
            <Form.Item name="main_image" hidden>
              <Input />
            </Form.Item>
            <div className="boutique-upload-card" style={{ padding: '16px' }}>
              <Upload
                listType="picture-card"
                fileList={mainImageList}
                beforeUpload={handleMainImageUpload}
                onRemove={(file) => handleRemoveImage(file, true)}
                onChange={handleMainImageChange}
                maxCount={1}
                accept="image/*"
                showUploadList={{
                  showPreviewIcon: true,
                  showRemoveIcon: true,
                  showDownloadIcon: false
                }}
              >
                {mainImageList.length < 1 && (
                  <div style={{ textAlign: 'center' }}>
                    {mainImageUploading ? <LoadingOutlined /> : <UploadOutlined />}
                    <div style={{ marginTop: 8, color: '#8c8c8c' }}>上传主图</div>
                  </div>
                )}
              </Upload>
            </div>
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="店铺图片"
            tooltip="店铺的详细图片，支持多张"
          >
            <Form.Item name="images" hidden>
              <Input />
            </Form.Item>
            <div className="boutique-upload-card" style={{ padding: '16px' }}>
              <Upload
                listType="picture-card"
                fileList={imageList}
                beforeUpload={handleImagesUpload}
                onRemove={(file) => handleRemoveImage(file, false)}
                onChange={handleImagesChange}
                maxCount={10}
                accept="image/*"
                showUploadList={{
                  showPreviewIcon: true,
                  showRemoveIcon: true,
                  showDownloadIcon: false
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  {imagesUploading ? <LoadingOutlined /> : <UploadOutlined />}
                  <div style={{ marginTop: 8, color: '#8c8c8c' }}>上传图片</div>
                </div>
              </Upload>
            </div>
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  // 设置表单
  const renderSettingsForm = () => (
    <Card className="boutique-edit-form-card" style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 600, color: '#262626' }}>
          店铺设置
        </Text>
        <div style={{ marginTop: '4px', color: '#8c8c8c', fontSize: '14px' }}>
          配置店铺的状态和其他设置
        </div>
      </div>

      <Form.Item
        label={
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <SettingOutlined />
            店铺状态
            <Text type="danger">*</Text>
          </span>
        }
        name="status"
        initialValue="open"
        rules={[{ required: true, message: '请选择店铺状态' }]}
      >
        <Select placeholder="请选择店铺状态" size="large" style={{ borderRadius: '8px' }}>
          <Option value="open">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircleOutlined style={{ color: '#52C41A' }} />
              开放营业
            </div>
          </Option>
          <Option value="closed">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EyeInvisibleOutlined style={{ color: '#8C8C8C' }} />
              暂停营业
            </div>
          </Option>
          <Option value="pending">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LoadingOutlined style={{ color: '#FA8C16' }} />
              待审核
            </div>
          </Option>
          <Option value="draft">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileTextOutlined style={{ color: '#722ED1' }} />
              草稿
            </div>
          </Option>
        </Select>
      </Form.Item>

      {isEditMode && (
        <Form.Item
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <UserOutlined />
              创建者
              <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>(管理员功能)</Text>
            </span>
          }
          name="user_created"
          tooltip="选择店铺的创建者用户，只有管理员可以使用此功能"
        >
          <Select
            placeholder="请选择创建者用户"
            size="large"
            style={{ borderRadius: '8px' }}
            loading={systemUsersLoading}
            showSearch
            allowClear
            filterOption={(input, option) => {
              const user = systemUsers.find(u => u.id === option?.value);
              if (!user) return false;
              const searchText = input.toLowerCase();
              
              // 构建显示名称
              const firstName = user.first_name?.trim() || '';
              const lastName = user.last_name?.trim() || '';
              const fullName = [firstName, lastName].filter(Boolean).join(' ');
              const displayName = fullName || user.email || `用户 ${user.id}`;
              
              return displayName.toLowerCase().includes(searchText) || 
                     user.email?.toLowerCase().includes(searchText) || false;
            }}
          >
            {systemUsers.map(user => {
              // 构建显示名称
              const firstName = user.first_name?.trim() || '';
              const lastName = user.last_name?.trim() || '';
              const fullName = [firstName, lastName].filter(Boolean).join(' ');
              const displayName = fullName || user.email || `用户 ${user.id}`;
              
              // 用户状态
              const isActive = user.status === 'active';
              
              return (
                <Option key={user.id} value={user.id} disabled={!isActive}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar 
                      size={24}
                      src={user.avatar?.id ? getImageUrl(user.avatar.id) : undefined}
                      style={{ 
                        backgroundColor: isActive ? '#667eea' : '#d9d9d9',
                        opacity: isActive ? 1 : 0.6
                      }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 500,
                        color: isActive ? '#262626' : '#8c8c8c'
                      }}>
                        {displayName}
                        {!isActive && (
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#ff7875',
                            marginLeft: '8px'
                          }}>
                            (已禁用)
                          </span>
                        )}
                      </div>
                      {user.email && displayName !== user.email && (
                        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                          {user.email}
                        </div>
                      )}
                    </div>
                  </div>
                </Option>
              );
            })}
          </Select>
        </Form.Item>
      )}
    </Card>
  );

  // 店铺信息卡片
  const renderBoutiqueInfo = () => (
    <Card className="boutique-info-card" style={{ marginBottom: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <Avatar 
          src={boutique?.main_image ? getImageUrl(boutique.main_image) : undefined}
          icon={<ShopOutlined />}
          size={80}
          style={{ 
            marginBottom: '16px',
            border: '4px solid rgba(255,255,255,0.2)'
          }}
        />
        
        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
          {boutique?.name || '新店铺'}
        </div>
        
        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '16px' }}>
          {boutique?.category || '未分类店铺'}
        </div>

        {!isEditMode ? null : (
          <>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '16px 0' }} />
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
                资料完整度
              </div>
              <Progress
                type="circle"
                percent={completeness}
                size={60}
                strokeColor="white"
                trailColor="rgba(255,255,255,0.2)"
                format={(percent) => 
                  <span style={{ color: 'white', fontSize: '12px' }}>
                    {percent}%
                  </span>
                }
              />
            </div>
            
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <div className="boutique-stats-item">
                  <div className="boutique-stats-number">
                    {boutique?.stars ? boutique.stars.toFixed(1) : '0.0'}
                  </div>
                  <div className="boutique-stats-label">店铺评分</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="boutique-stats-item">
                  <div className="boutique-stats-number">
                    {boutique?.status === 'open' ? '营业中' : '已关闭'}
                  </div>
                  <div className="boutique-stats-label">营业状态</div>
                </div>
              </Col>
            </Row>
          </>
        )}
      </div>
    </Card>
  );

  return (
    <div className="boutique-edit-container">
      {/* 数据加载状态 */}
      {isEditMode && (boutiquesLoading || (!boutique && boutiquesData)) && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px', color: '#8c8c8c' }}>加载店铺数据中...</div>
        </div>
      )}

      {/* 只有在数据准备就绪时才渲染表单 */}
      {(!isEditMode || boutique || boutiquesLoading) && (
        <>
          {/* 页面头部 */}
          <Card className="boutique-edit-header-card">
            <Row justify="space-between" align="middle">
              <Col>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Button 
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBack}
                    size="large"
                    style={{ 
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'white',
                      borderRadius: '8px'
                    }}
                  >
                    返回
                  </Button>
                  
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                      <Title level={3} style={{ margin: 0, color: 'white' }}>
                        {isEditMode ? '编辑店铺' : '新增店铺'}
                      </Title>
                      
                      <Tag className={isEditMode ? 'edit-mode-badge' : 'new-mode-badge'}>
                        {isEditMode ? '编辑模式' : '新建模式'}
                      </Tag>
                    </div>
                    
                    <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {isEditMode 
                        ? `编辑店铺：${boutique?.name || '加载中...'}`
                        : '创建新的店铺信息'
                      }
                    </Text>
                  </div>
                </div>
          </Col>
          
          <Col>
            <Space size="middle">
              <Button 
                onClick={handleBack}
                size="large"
                style={{ 
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: '8px'
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
                size="large"
                style={{ 
                  background: 'white',
                  border: 'none',
                  color: '#667eea',
                  fontWeight: 600,
                  borderRadius: '8px'
                }}
              >
                保存
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要内容 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Form 
            form={form} 
            layout="vertical"
            className="boutique-form"
            size="large"
          >
            <Tabs 
              className="boutique-edit-tabs"
              size="large"
            >
              <Tabs.TabPane 
                tab={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <InfoCircleOutlined />
                    基本信息
                  </span>
                }
                key="basic"
              >
                {renderBasicForm()}
              </Tabs.TabPane>
              
              <Tabs.TabPane 
                tab={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PictureOutlined />
                    图片管理
                  </span>
                }
                key="images"
              >
                {renderImagesForm()}
              </Tabs.TabPane>
              
              <Tabs.TabPane 
                tab={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SettingOutlined />
                    店铺设置
                  </span>
                }
                key="settings"
              >
                {renderSettingsForm()}
              </Tabs.TabPane>
            </Tabs>
          </Form>
        </Col>
        
        <Col xs={24} lg={8}>
          {renderBoutiqueInfo()}
          
          {isEditMode && boutique?.address && (
            <Card className="boutique-edit-form-card">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ fontSize: '16px', fontWeight: 600 }}>
                  店铺地址
                </Text>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <EnvironmentOutlined style={{ color: 'white', fontSize: '20px' }} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
                    {boutique.address}
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
                    {boutique.city || '城市信息'}
                  </div>
                </div>
              </div>
              
              <Tag color="blue" style={{ borderRadius: '16px' }}>
                {boutique.category || '店铺类别'}
              </Tag>
            </Card>
          )}
        </Col>
      </Row>
      </>
    )}
  </div>
  );
}

export default function BoutiqueEditPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <BoutiqueEditContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}

/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { App, Button, Drawer, message, Spin, Transfer } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useAPIClient, useDataSource } from '@nocobase/client';
import { useResourceActionContext } from '@nocobase/client';

interface CollectionItem {
  key: string;
  title: string;
  name: string;
}

export const LoadCollectionsFromDataSourceAction: React.FC = () => {
  const { t } = useTranslation();
  const { name: dataSourceKey } = useParams();
  const api = useAPIClient();
  const { modal } = App.useApp();
  const { refresh } = useResourceActionContext();
  const ds = useDataSource();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  const [availableCollections, setAvailableCollections] = useState<CollectionItem[]>([]);

  const initializeData = useCallback(async () => {
    if (!dataSourceKey) return;
    setLoading(true);
    try {
      const response = await api.resource('dataSources').readTables({
        values: { dataSourceKey },
      });
      const collections = response.data?.data || [];
      const data = collections.map((item) => ({
        key: item.name,
        name: item.name,
        title: item.title || item.name,
      }));
      setAvailableCollections(data);
      setTargetKeys(collections.filter((item) => item.selected).map((item) => item.name));
    } catch (error) {
      message.error(t('Failed to load tables'));
    } finally {
      setLoading(false);
    }
  }, [api, dataSourceKey, t]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    initializeData();
  }, [initializeData]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    setSearchValue('');
    setSelectedKeys([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!dataSourceKey) return;
    if (!targetKeys.length) {
      message.warning(t('Please select at least one table'));
      return;
    }
    modal.confirm({
      title: t('Confirm load tables'),
      content: t('Are you sure you want to load {{count}} table(s)?', { count: targetKeys.length }),
      onOk: async () => {
        try {
          setLoading(true);
          await api.resource('dataSources').loadTables({
            values: {
              dataSourceKey,
              tables: targetKeys,
            },
          });
          message.success(t('Tables loaded successfully'));
          setOpen(false);
          refresh?.();
          ds.reload();
        } catch (error) {
          message.error(t('Failed to load tables'));
        } finally {
          setLoading(false);
        }
      },
    });
  }, [api, dataSourceKey, ds, modal, refresh, t, targetKeys]);

  const filteredDataSource = useMemo(() => {
    if (!searchValue) return availableCollections;
    const value = searchValue.toLowerCase();
    return availableCollections.filter((item) => item.title.toLowerCase().includes(value) || item.name.includes(value));
  }, [availableCollections, searchValue]);

  return (
    <>
      <Button icon={<ImportOutlined />} onClick={handleOpen}>
        {t('Load tables from database')}
      </Button>
      <Drawer
        title={t('Load tables from database')}
        placement="right"
        onClose={handleCancel}
        open={open}
        width={800}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
              {t('Cancel')}
            </Button>
            <Button type="primary" onClick={handleSubmit} loading={loading} disabled={!targetKeys.length}>
              {t('Submit')}
            </Button>
          </div>
        }
      >
        <div style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
          <Spin spinning={loading} style={{ height: '100%' }}>
            <Transfer
              dataSource={filteredDataSource}
              targetKeys={targetKeys}
              selectedKeys={selectedKeys}
              onChange={setTargetKeys}
              onSelectChange={(sourceSelectedKeys, targetSelectedKeys) =>
                setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys])
              }
              onSearch={(_, value) => setSearchValue(value)}
              render={(item) => item.title}
              showSearch
              style={{ height: '100%' }}
              listStyle={{
                width: 350,
                height: 'calc(100vh - 100px)',
              }}
              locale={{
                itemUnit: t('item'),
                itemsUnit: t('items'),
                searchPlaceholder: t('Search collections...'),
              }}
            />
          </Spin>
        </div>
      </Drawer>
    </>
  );
};

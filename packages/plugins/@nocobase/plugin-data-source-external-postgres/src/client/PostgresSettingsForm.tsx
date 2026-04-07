/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import React from 'react';
import { SchemaComponent } from '@nocobase/client';
import { useTranslation } from 'react-i18next';
import { NAMESPACE } from './locale';

const DSM_NAMESPACE = 'data-source-manager';

const DataSourceSettingsForm = (
  props: { CollectionsTableField: any; loadCollections: any; from: string },
  resourceData?: any,
) => {
  const { CollectionsTableField, loadCollections, from } = props;
  const { t } = useTranslation([NAMESPACE, DSM_NAMESPACE, 'client']);
  const { CollectionsTable, createCollectionsSchema, Text, addAllCollectionsSchema } = CollectionsTableField({
    NAMESPACE: DSM_NAMESPACE,
    t,
  });

  return (
    <SchemaComponent
      scope={{ CollectionsTable, loadCollections, from, Text }}
      components={{ CollectionsTable }}
      schema={{
        type: 'void',
        properties: {
          displayName: {
            type: 'string',
            title: `{{t("Data source display name", { ns: "${NAMESPACE}" })}}`,
            required: true,
            'x-decorator': 'FormItem',
            'x-component': 'Input',
          },
          key: {
            type: 'string',
            title: `{{t("Data source name", { ns: "${NAMESPACE}" })}}`,
            required: true,
            'x-validator': 'uid',
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': {
              disabled: from === 'edit',
            },
            description: `{{t("Identifier, only letters, numbers and underscores", { ns: "${NAMESPACE}" })}}`,
          },
          'options.host': {
            type: 'string',
            title: `{{t("Host", { ns: "${NAMESPACE}" })}}`,
            required: true,
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            default: 'localhost',
          },
          'options.port': {
            type: 'number',
            title: `{{t("Port", { ns: "${NAMESPACE}" })}}`,
            required: true,
            'x-decorator': 'FormItem',
            'x-component': 'InputNumber',
            default: 5432,
          },
          'options.database': {
            type: 'string',
            title: `{{t("Database", { ns: "${NAMESPACE}" })}}`,
            required: true,
            'x-decorator': 'FormItem',
            'x-component': 'Input',
          },
          'options.schema': {
            type: 'string',
            title: `{{t("Schema", { ns: "${NAMESPACE}" })}}`,
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            default: 'public',
          },
          'options.username': {
            type: 'string',
            title: `{{t("Username", { ns: "${NAMESPACE}" })}}`,
            required: true,
            'x-decorator': 'FormItem',
            'x-component': 'Input',
          },
          'options.password': {
            type: 'string',
            title: `{{t("Password", { ns: "${NAMESPACE}" })}}`,
            'x-decorator': 'FormItem',
            'x-component': 'Password',
          },
          'options.tablePrefix': {
            type: 'string',
            title: `{{t("Table prefix", { ns: "${NAMESPACE}" })}}`,
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            description: `{{t("If set, only tables with this prefix will be loaded", { ns: "${NAMESPACE}" })}}`,
          },
          'options.ssl': {
            type: 'boolean',
            title: `{{t("SSL connection", { ns: "${NAMESPACE}" })}}`,
            'x-decorator': 'FormItem',
            'x-component': 'Checkbox',
            default: false,
          },
          addAllCollections: addAllCollectionsSchema,
          collections: createCollectionsSchema(from, loadCollections),
        },
      }}
    />
  );
};

export default DataSourceSettingsForm;

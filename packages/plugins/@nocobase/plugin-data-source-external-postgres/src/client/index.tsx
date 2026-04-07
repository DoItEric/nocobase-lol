/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Plugin } from '@nocobase/client';
import PluginDataSourceManagerClient from '@nocobase/plugin-data-source-manager/client';
import DataSourceSettingsForm from './PostgresSettingsForm';

export class PluginDataSourceExternalPostgresClient extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    const dsManagerPlugin = this.app.pm.get(PluginDataSourceManagerClient);
    dsManagerPlugin?.registerType('postgres', {
      label: '{{t("PostgreSQL")}}',
      name: 'postgres',
      DataSourceSettingsForm,
    });
  }
}

export default PluginDataSourceExternalPostgresClient;

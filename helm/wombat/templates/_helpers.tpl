{{/*
Expand the name of the chart.
*/}}
{{- define "wombat.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "wombat.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "wombat.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "wombat.labels" -}}
helm.sh/chart: {{ include "wombat.chart" . }}
{{ include "wombat.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "wombat.selectorLabels" -}}
app.kubernetes.io/name: {{ include "wombat.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "wombat.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "wombat.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "wombat.persistenceEnv" -}}
{{- $manifest := include (print .Template.BasePath "/configmap-override.yaml") . | fromYaml -}}
{{- $config := index $manifest.data "application.yaml" | fromYaml -}}
{{- $backend := $config.persistence.backend }}
- name: PERSISTENCE_BACKEND_MODE
  value: {{ $backend.mode | quote }}
{{- if eq $backend.mode "sqlite" }}
- name: PERSISTENCE_BACKEND_SQLITE_JDBC_URL
  value: {{ index $backend.sqlite "jdbc-url" | quote }}
{{- else }}
{{- $postgres := $backend.postgresql | default dict }}
{{- range $key, $env := dict "jdbc-url" "PERSISTENCE_BACKEND_POSTGRESQL_JDBC_URL" "username" "PERSISTENCE_BACKEND_POSTGRESQL_USERNAME" "password" "PERSISTENCE_BACKEND_POSTGRESQL_PASSWORD" }}
{{- if hasKey $postgres $key }}
- name: {{ $env }}
  {{- if and (eq $key "password") (eq (index $postgres $key) "${POSTGRESQL_PASSWORD}") $.Values.persistence.postgresql.existingSecret }}
  valueFrom:
    secretKeyRef:
      name: {{ $.Values.persistence.postgresql.existingSecret | quote }}
      key: {{ $.Values.persistence.postgresql.passwordKey | quote }}
  {{- else }}
  value: {{ index $postgres $key | quote }}
  {{- end }}
{{- end }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Turns on the app's oidc profile and passes it the client secret, validated in configmap-override.yaml
*/}}
{{- define "wombat.oidcEnv" -}}
{{- if .Values.security.enabled }}
- name: QUARKUS_PROFILE
  value: "prod,oidc"
- name: QUARKUS_OIDC_CREDENTIALS_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "wombat.fullname" . }}-oidc
      key: client-secret
{{- end }}
{{- end }}

{{/*
Passes the app the database KEKs and the Vault credentials, validated in configmap-override.yaml
*/}}
{{- define "wombat.secretsEnv" -}}
{{- $secrets := .Values.secrets }}
{{- if eq ($secrets.writeMode | default "disabled") "database" }}
{{- $database := $secrets.database | default dict }}
{{- range $id, $_ := $database.kek }}
- name: WOMBAT_SECRET_DATABASE_KEK_{{ $id | replace "-" "_" | upper }}
  valueFrom:
    secretKeyRef:
      name: {{ $database.existingSecret | default (printf "%s-secret-kek" (include "wombat.fullname" $)) | quote }}
      key: {{ $id | quote }}
{{- end }}
{{- end }}
{{- $vault := $secrets.vault | default dict }}
{{- if $vault.enabled }}
{{- $authentication := ($vault.client | default dict).authentication | default dict }}
{{- if $authentication.clientToken }}
- name: QUARKUS_VAULT_AUTHENTICATION_CLIENT_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ include "wombat.fullname" . }}-vault
      key: client-token
{{- end }}
{{- if ($authentication.appRole | default dict).secretId }}
- name: QUARKUS_VAULT_AUTHENTICATION_APP_ROLE_SECRET_ID
  valueFrom:
    secretKeyRef:
      name: {{ include "wombat.fullname" . }}-vault
      key: app-role-secret-id
{{- end }}
{{- end }}
{{- end }}

{{/*
Mounts the app's secret directory (provisioned and existing Secrets) and Vault's CA
*/}}
{{- define "wombat.secretsVolumeMounts" -}}
{{- if or .Values.secrets.provisioned .Values.secrets.existingSecrets }}
- name: secrets
  mountPath: /secrets
{{- end }}
{{- if and .Values.secrets.vault.enabled .Values.secrets.vault.caCert }}
- name: vault-ca
  mountPath: /etc/wombat/vault
{{- end }}
{{- end }}

{{- define "wombat.secretsVolumes" -}}
{{- if or .Values.secrets.provisioned .Values.secrets.existingSecrets }}
{{- /* One directory for both, so the app's single directory resolver reads them all */}}
- name: secrets
  projected:
    sources:
      {{- if .Values.secrets.provisioned }}
      - secret:
          name: {{ include "wombat.fullname" . }}-secrets
      {{- end }}
      {{- range .Values.secrets.existingSecrets }}
      - secret:
          name: {{ . | quote }}
      {{- end }}
{{- end }}
{{- if and .Values.secrets.vault.enabled .Values.secrets.vault.caCert }}
- name: vault-ca
  configMap:
    name: {{ include "wombat.fullname" . }}-vault-ca
{{- end }}
{{- end }}

{{/*
Turns the camelCase keys of a map into the kebab-case keys of application.yaml, recursively, as Pulumi's kebabize does.
Returns YAML: pipe it into fromYaml.
*/}}
{{- define "wombat.kebabize" -}}
{{- $kebab := dict }}
{{- range $key, $value := . }}
{{- $name := regexReplaceAll "([a-z])([A-Z])" $key "${1}-${2}" | lower }}
{{- if kindIs "map" $value }}
{{- $_ := set $kebab $name (include "wombat.kebabize" $value | fromYaml) }}
{{- else }}
{{- $_ := set $kebab $name $value }}
{{- end }}
{{- end }}
{{- toYaml $kebab }}
{{- end }}

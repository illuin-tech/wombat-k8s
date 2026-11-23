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

{{- define "wombat.oidcEnv" -}}
{{- if .Values.security.enabled }}
{{- $oidc := .Values.security.oidc | default dict }}
{{- $credentials := $oidc.credentials | default dict }}
{{- $authServerUrl := index $oidc "auth-server-url" }}
{{- $clientId := index $oidc "client-id" }}
{{- $configOverrides := .Values.configOverrides | default dict }}
{{- $authOverrides := $configOverrides.auth | default dict }}
{{- $securityAuth := .Values.security.auth | default dict }}
{{- $auth := mergeOverwrite $securityAuth $authOverrides }}
{{- $roles := $auth.roles | default dict }}
{{- $existingSecret := $credentials.existingSecret }}
{{- if not $roles.admin }}
{{- fail "security.auth.roles.admin must contain at least one role or email when security.enabled is true" }}
{{- end }}
{{- if and $credentials.secret $existingSecret }}
{{- fail "Set only one of security.oidc.credentials.secret or security.oidc.credentials.existingSecret" }}
{{- end }}
{{- if not (or $credentials.secret $existingSecret) }}
{{- fail "security.oidc.credentials.secret or security.oidc.credentials.existingSecret is required when security.enabled is true" }}
{{- end }}
{{- $_ := required "security.oidc.auth-server-url is required when security.enabled is true" $authServerUrl }}
{{- $_ := required "security.oidc.client-id is required when security.enabled is true" $clientId }}
- name: QUARKUS_PROFILE
  value: "prod,oidc"
- name: QUARKUS_OIDC_CREDENTIALS_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ $existingSecret | default (printf "%s-oidc" (include "wombat.fullname" .)) | quote }}
      key: client-secret
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

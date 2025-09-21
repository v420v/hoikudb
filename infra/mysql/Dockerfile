FROM mysql:8.0.39

# タイムゾーン設定
ARG TZ=Asia/Tokyo
ENV TZ=${TZ}

# 言語設定
ENV LANG=ja_JP.UTF-8
ENV LANGUAGE=ja_JP:ja
ENV LC_ALL=ja_JP.UTF-8

# ログディレクトリの作成
RUN mkdir -p /var/log/mysql && \
    chown mysql:mysql /var/log/mysql

# カスタム設定ファイルのコピー
COPY infra/mysql/my.cnf /etc/mysql/conf.d/my.cnf

# 権限設定
RUN chown mysql:mysql /etc/mysql/conf.d/my.cnf

EXPOSE 3306

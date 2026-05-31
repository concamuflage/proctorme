// Jenkins CI/CD pipeline for project888
// This pipeline:
// 1. Checks out code from GitHub
// 2. Copies environment (.env) files from the VM
// 3. Installs dependencies
// 4. Builds the Next.js app
// 5. Deploys the Next.js app using PM2
pipeline {
    agent any

    environment {
        // Database connection string stored securely in Jenkins credentials
        DATABASE_URL = credentials('database-url')

        // Set HOME for Jenkins user (important for tools like pm2)
        HOME = '/var/lib/jenkins'

        // PM2 process manager home directory
        PM2_HOME = '/var/lib/jenkins/.pm2'
    }

    stages {
        // Pull latest code from the configured Git repository
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Copy Environment Files') {
            steps {
                // Copy env files from /home/concamuflage/project888 to the Jenkins workspace,
                // preserving directory structure and excluding all other files.
                sh '''
                    rsync -av \
                    --include="*/" \
                    --include=".env*" \
                    --exclude="*" \
                    /home/concamuflage/project888/ .
                '''
            }
        }

        // Install dependencies from package.json
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        // Build the Next.js app for production
        stage('Build Next.js App') {
            steps {
                sh 'npm run build'
            }
        }

        // Deploy or restart the frontend app from the Jenkins workspace build.
        stage('Deploy Next.js App') {
            steps {
                sh '''
                    pm2 startOrReload ecosystem.config.cjs --update-env
                    pm2 save
                '''
            }
        }

        // stage('Post-deploy Auth UI Tests') {
        //     steps {
        //         dir("${WORKSPACE}/test/ui") {
        //             sh '''
        //                 NODE_ENV=production \
        //                 mvn -Dtest=TaggedRunner \
        //                     -Dheadless=true \
        //                     -Dcucumber.filter.tags='@Signup or @ResetPassword' \
        //                     test
        //             '''
        //         }
        //     }
        // }

        // stage('Test') {
        //     steps {
        //         dir("${WORKSPACE}") {
        //         /*
        //         * Runs automated tests.
        //         * If tests fail, the pipeline stops here.
        //         */
        //         sh 'npm test'
        //     }
        // }
        
    }
}

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink, organization } from "better-auth/plugins";
import { prisma } from "./prisma";
import nodemailer from "nodemailer";

// Configuration du transporteur d'email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [
    "http://localhost:3000",  // Dev local
    "http://localhost:8081",  // Docker
  ],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token }, request) => {
        // Envoyer l'email avec le lien magique
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: "Your Magic Link",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Magic Link Authentication</h2>
                <p>Click the button below to sign in to your account:</p>
                <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
                  Sign In
                </a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${url}</p>
                <p style="color: #999; font-size: 12px;">This link will expire in 5 minutes.</p>
              </div>
            `,
          });
        } catch (error) {
          console.error("Error sending magic link email:", error);
          throw new Error("Failed to send magic link email");
        }
      },
      expiresIn: 300, // 5 minutes
    }),
    organization({
      // ✅ Configuration recommandée pour Epitrello
      allowUserToCreateOrganization: true, // Tout le monde peut créer une organisation (workspace)
      organizationLimit: 10, // Limite de 10 workspaces par utilisateur
      creatorRole: "owner", // Le créateur devient owner
      membershipLimit: 50, // Max 50 membres par organisation (plan gratuit)
      invitationExpiresIn: 604800, // 7 jours (au lieu de 48h par défaut)
      invitationLimit: 100,
      requireEmailVerificationOnInvitation: false, // Pas besoin de vérifier l'email pour rejoindre
      cancelPendingInvitationsOnReInvite: true, // Annuler les anciennes invitations
      
      // ✅ Activer les teams pour les boards
      teams: {
        enabled: true,
        maximumTeams: 20, // Max 20 teams (boards) par organisation
        allowRemovingAllTeams: false, // Toujours garder au moins 1 team
      },
      
      async sendInvitationEmail(data) {
        try {
          const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation/${data.id}`;
          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: data.email,
            subject: `You've been invited to join ${data.organization.name} on Epitrello`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>🎉 You've been invited to Epitrello!</h2>
                <p><strong>${data.inviter.user.name}</strong> has invited you to join <strong>${data.organization.name}</strong>.</p>
                <p>Role: <span style="background: #f0f0f0; padding: 2px 8px; border-radius: 4px;">${data.role}</span></p>
                <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0079BF; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
                  Accept Invitation
                </a>
                <p style="color: #666; font-size: 14px;">Or copy and paste this link:</p>
                <p style="word-break: break-all; color: #0079BF; font-size: 12px;">${inviteUrl}</p>
                <p style="color: #999; font-size: 12px; margin-top: 40px;">This invitation will expire in 7 days.</p>
              </div>
            `,
          });
        } catch (error) {
          console.error("Error sending invitation email:", error);
        }
      },
      
      // ✅ Hooks pour Epitrello
      organizationHooks: {
        afterCreateOrganization: async ({ organization, member, user }) => {
          console.log(`✅ New workspace created: ${organization.name} by ${user.name}`);
          // TODO: Créer un board par défaut "General" pour la nouvelle organisation
        },
        
        afterAddMember: async ({ member, user, organization }) => {
          console.log(`✅ New member added: ${user.email} to ${organization.name}`);
          // TODO: Envoyer une notification de bienvenue
        },
      },
    }),
  ],
});

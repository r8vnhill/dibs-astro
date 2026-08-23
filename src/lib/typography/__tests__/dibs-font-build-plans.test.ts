/**
 * Verifies the committed Iosevka plans as configuration, not as a copy of their TOML text.
 *
 * The test reads the real build plan and provenance files so family identity, role dimensions, ligation policy, and
 * the revision digest cannot drift independently.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "smol-toml";
import { expect, suite, test } from "vitest";
import { proportionalFontContract } from "../proportional-font-contract";

type WeightPlan = Readonly<{
    shape: number;
    menu: number;
    css: number;
}>;

type SlopePlan = Readonly<{
    angle: number;
    shape: "upright" | "italic" | "oblique";
    menu: "upright" | "italic" | "oblique";
    css: "normal" | "italic" | "oblique";
}>;

type BuildPlan = Readonly<{
    family: string;
    spacing: string;
    serifs: "sans" | "slab";
    noLigation?: boolean;
    weights: Readonly<Record<string, WeightPlan>>;
    slopes: Readonly<Record<string, SlopePlan>>;
}>;

type BuildPlanDocument = Readonly<{
    buildPlans: Readonly<Record<string, BuildPlan>>;
}>;

type UpstreamPin = Readonly<{
    buildPlanRevision: string;
    project: string;
    version: string;
    tag: string;
}>;

const buildPlansPath = resolve(process.cwd(), "scripts/fonts/iosevka/private-build-plans.toml");
const buildPlansSource = readFileSync(buildPlansPath);

const buildPlans = parse(buildPlansSource.toString("utf8")) as unknown as BuildPlanDocument;
const upstreamPin = JSON.parse(
    readFileSync(resolve(process.cwd(), "scripts/fonts/iosevka/upstream.json"), "utf8"),
) as UpstreamPin;

function getBuildPlan(name: string): BuildPlan {
    const plan = buildPlans.buildPlans[name];

    if (!plan) {
        throw new Error(`Build plan not found: ${name}`);
    }

    return plan;
}

const stateDimensions = (plan: BuildPlan) => ({
    weights: Object.values(plan.weights).map(({ css }) => css),
    slopes: Object.values(plan.slopes).map(({ css }) => css),
});

const requiredDimensions = (states: readonly { weight: number; style: string }[]) => ({
    weights: [...new Set(states.map(({ weight }) => weight))],
    slopes: [...new Set(states.map(({ style }) => style))],
});

const candidateProfiles = [
    ["dibs-sans", "DIBS Sans", "sans", proportionalFontContract.roles.body.states],
    ["dibs-slab", "DIBS Slab", "slab", proportionalFontContract.roles.heading.states],
] as const;

suite("given the DIBS Iosevka production build plans", () => {
    test("then exactly the two proportional-text candidates are defined", () => {
        expect(Object.keys(buildPlans.buildPlans).sort()).toEqual(["dibs-sans", "dibs-slab"]);
    });

    test.each(candidateProfiles)(
        "then %s defines its role-specific quasi-proportional design",
        (planName, family, serifs, states) => {
            const plan = getBuildPlan(planName);

            expect(plan.family).toBe(family);
            expect(plan.spacing).toBe("quasi-proportional");
            expect(plan.serifs).toBe(serifs);
            expect(stateDimensions(plan)).toEqual(requiredDimensions(states));
        },
    );

    test.each(["dibs-sans", "dibs-slab"])("then %s does not disable ligations", (planName) => {
        expect(getBuildPlan(planName).noLigation).not.toBe(true);
    });

    test("then both candidates use the pinned Iosevka source boundary", () => {
        const candidatePlans = Object.values(buildPlans.buildPlans);

        expect(candidatePlans).toHaveLength(2);
        expect(upstreamPin).toMatchObject({
            project: "Iosevka",
            version: "34.8.0",
            tag: "v34.8.0",
        });
        expect(upstreamPin.buildPlanRevision).toBe(
            `sha256:${createHash("sha256").update(buildPlansSource).digest("hex")}`,
        );
    });
});

{
  description = "megiddo";

  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {

          packages = with pkgs; [
            git
            gh
            jq
            nodejs
            pnpm
            nixfmt
            opencode
            xdg-utils
          ];

          shellHook = ''
            pnpm install --frozen-lockfile
          '';

        };
      }
    );
}
